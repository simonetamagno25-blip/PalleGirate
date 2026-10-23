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

/** Esegue in transazione e trasforma la violazione della chiave di occupazione in SLOT_TAKEN. */
async function inTx<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await db.$transaction(fn);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new DomainError([{ code: "SLOT_TAKEN" }]);
    }
    throw e;
  }
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
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: { fieldId: field.id, start: input.start, end, slots: input.slots, priceCents: bookingPrice(field.priceCents, input.slots) },
    });
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
    const cancelled = await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", chargeable, cancelReason: cleanReason, cancelledById: actor.userId, cancelledAt: now },
    });
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
