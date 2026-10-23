import { Prisma } from "@prisma/client";
import {
  bookingEnd,
  bookingPrice,
  canMemberChange,
  checkMemberRules,
  checkSchedule,
  isLateCancellation,
  quarterStarts,
} from "@/lib/booking-rules";
import type { Db, Tx } from "./db";
import { DomainError, fail } from "./errors";
import { getMemberState } from "./member-state";
import { notify } from "./notifications";
import { getSettings } from "./settings";

export type Actor = { userId: string; mode: "member" | "admin" };
export type BookingInput = { fieldId: string; start: Date; slots: number };

/**
 * Esegue in transazione e traduce i conflitti di concorrenza in SLOT_TAKEN:
 * - P2002 solo se riguarda FieldOccupancy (chiave primaria fieldId+quarterStart);
 * - P2034 (write conflict / deadlock, es. su PostgreSQL tra create e update su quarti sovrapposti):
 *   la transazione perdente è stata annullata, quindi lo slot è di fatto già preso dall'altra.
 */
async function inTx<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await db.$transaction(fn);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2034" || (e.code === "P2002" && isOccupancyConflict(e))) {
        throw new DomainError([{ code: "SLOT_TAKEN" }]);
      }
    }
    throw e;
  }
}

function isOccupancyConflict(e: Prisma.PrismaClientKnownRequestError) {
  const meta = (e.meta ?? {}) as { modelName?: unknown; target?: unknown };
  if (meta.modelName === "FieldOccupancy") return true;
  const target = Array.isArray(meta.target) ? meta.target.join(",") : String(meta.target ?? "");
  return /quarterStart|FieldOccupancy/.test(target);
}

async function validate(tx: Tx, actor: Actor, memberId: string, input: BookingInput, now: Date, excludeBookingId?: string) {
  const [field, settings] = await Promise.all([tx.field.findUnique({ where: { id: input.fieldId } }), getSettings(tx)]);
  if (!field) return fail("NOT_FOUND");
  const violations = checkSchedule(input, field, settings);
  if (actor.mode === "member") {
    const state = await getMemberState(tx, memberId, now, excludeBookingId);
    violations.push(...checkMemberRules(input, settings, state, now));
  }
  if (violations.length) throw new DomainError(violations);
  return { field, settings, end: bookingEnd(input.start, input.slots, field) };
}

async function occupy(tx: Tx, bookingId: string, fieldId: string, start: Date, end: Date) {
  const quarters = quarterStarts(start, end);
  const clash = await tx.fieldOccupancy.findFirst({ where: { fieldId, quarterStart: { in: quarters } } });
  if (clash) fail("SLOT_TAKEN");
  // Anche se due richieste passano il controllo insieme, la chiave primaria ne fa fallire una (P2002).
  await tx.fieldOccupancy.createMany({ data: quarters.map((quarterStart) => ({ fieldId, quarterStart, bookingId })) });
}

export async function releaseOccupancy(tx: Tx, bookingId: string) {
  await tx.fieldOccupancy.deleteMany({ where: { bookingId } });
}

async function loadForChange(tx: Tx, actor: Actor, bookingId: string) {
  const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { field: true } });
  if (!booking) return fail("NOT_FOUND");
  if (actor.mode === "member" && booking.memberId !== actor.userId) fail("FORBIDDEN");
  if (booking.status === "CANCELLED") fail("ALREADY_CANCELLED");
  return booking;
}

const by = (actor: Actor) => (actor.mode === "admin" ? "admin" : "self");

export async function createBooking(db: Db, actor: Actor, memberId: string, input: BookingInput, now = new Date()) {
  if (actor.mode === "member" && actor.userId !== memberId) fail("FORBIDDEN");
  return inTx(db, async (tx) => {
    const member = await tx.user.findUnique({ where: { id: memberId } });
    if (!member) return fail("NOT_FOUND");
    const { field, end } = await validate(tx, actor, memberId, input, now);
    const booking = await tx.booking.create({
      data: { memberId, fieldId: field.id, start: input.start, end, slots: input.slots, priceCents: bookingPrice(field.priceCents, input.slots) },
    });
    await occupy(tx, booking.id, field.id, input.start, end);
    await notify(tx, memberId, "BOOKING_CREATED", { field: field.name, start: input.start.toISOString(), by: by(actor) });
    return booking;
  });
}

export async function updateBooking(db: Db, actor: Actor, bookingId: string, input: BookingInput, now = new Date()) {
  return inTx(db, async (tx) => {
    const booking = await loadForChange(tx, actor, bookingId);
    const settings = await getSettings(tx);
    // La finestra si misura sull'inizio ORIGINALE della prenotazione.
    if (actor.mode === "member" && !canMemberChange(booking.start, now, settings)) {
      fail("CHANGE_WINDOW_CLOSED", { hours: settings.changeWindowMinutes / 60 });
    }
    await releaseOccupancy(tx, booking.id);
    const { field, end } = await validate(tx, actor, booking.memberId, input, now, booking.id);
    // Scrittura condizionata: se nel frattempo è stata cancellata non si reinseriscono le occupazioni.
    const res = await tx.booking.updateMany({
      where: { id: booking.id, status: "CONFIRMED" },
      data: { fieldId: field.id, start: input.start, end, slots: input.slots, priceCents: bookingPrice(field.priceCents, input.slots) },
    });
    if (res.count === 0) fail("ALREADY_CANCELLED");
    const updated = await tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
    await occupy(tx, booking.id, field.id, input.start, end);
    await notify(tx, booking.memberId, "BOOKING_UPDATED", { field: field.name, start: input.start.toISOString(), by: by(actor) });
    return updated;
  });
}

export async function cancelBooking(db: Db, actor: Actor, bookingId: string, reason?: string, now = new Date()) {
  return inTx(db, async (tx) => {
    const booking = await loadForChange(tx, actor, bookingId);
    const settings = await getSettings(tx);
    if (actor.mode === "member" && !canMemberChange(booking.start, now, settings)) {
      fail("CHANGE_WINDOW_CLOSED", { hours: settings.changeWindowMinutes / 60 });
    }
    // Solo l'admin può cancellare in ritardo; in quel caso la prenotazione resta da pagare.
    const chargeable = actor.mode === "admin" && isLateCancellation(booking.start, now, settings);
    const cleanReason = reason?.trim() || null;
    const res = await tx.booking.updateMany({
      where: { id: booking.id, status: "CONFIRMED" },
      data: { status: "CANCELLED", chargeable, cancelReason: cleanReason, cancelledById: actor.userId, cancelledAt: now },
    });
    if (res.count === 0) fail("ALREADY_CANCELLED");
    const cancelled = await tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
    await releaseOccupancy(tx, booking.id);
    await notify(tx, booking.memberId, "BOOKING_CANCELLED", {
      field: booking.field.name,
      start: booking.start.toISOString(),
      by: by(actor),
      ...(cleanReason ? { reason: cleanReason } : {}),
      chargeable: chargeable ? 1 : 0,
    });
    return cancelled;
  });
}
