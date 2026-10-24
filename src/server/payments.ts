import { isBlocked, strikeConsequence } from "@/lib/booking-rules";
import { releaseOccupancy } from "./bookings";
import type { Db, Tx } from "./db";
import { fail } from "./errors";
import { notify } from "./notifications";

export type PaymentStatus = "PAID" | "UNPAID" | "EXEMPT";

async function blockedState(tx: Tx | Db, memberId: string) {
  const [strikes, unpaid] = await Promise.all([
    tx.strike.count({ where: { memberId } }),
    tx.booking.count({ where: { memberId, paymentStatus: "UNPAID" } }),
  ]);
  return { strikes, unpaid, blocked: isBlocked(strikes, unpaid) };
}

/**
 * Blocco: cancella le prenotazioni future (non quelle in corso o passate). Non sono da pagare.
 * `announce` è true solo nella transizione non bloccato → bloccato: su un socio già bloccato
 * le prenotazioni future residue vanno comunque cancellate, ma senza un secondo ACCOUNT_BLOCKED.
 */
async function applyBlock(tx: Tx, memberId: string, now: Date, announce: boolean) {
  const future = await tx.booking.findMany({ where: { memberId, status: "CONFIRMED", start: { gt: now } }, include: { field: true } });
  for (const b of future) {
    await tx.booking.update({
      where: { id: b.id },
      data: { status: "CANCELLED", chargeable: false, cancelledById: null, cancelledAt: now },
    });
    await releaseOccupancy(tx, b.id);
    await notify(tx, memberId, "BOOKING_CANCELLED_BLOCK", { field: b.field.name, start: b.start.toISOString() });
  }
  if (announce) await notify(tx, memberId, "ACCOUNT_BLOCKED", { cancelled: future.length });
}

export async function setPaymentStatus(db: Db, bookingId: string, status: PaymentStatus, now = new Date()) {
  await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { strike: true } });
    if (!booking) return fail("NOT_FOUND");
    if (!booking.chargeable || booking.end > now) fail("INVALID_INPUT");
    if (booking.paymentStatus === status) return;

    const memberId = booking.memberId;
    const before = await blockedState(tx, memberId);
    await tx.booking.update({ where: { id: booking.id }, data: { paymentStatus: status } });

    if (status === "UNPAID") {
      if (!booking.strike) {
        await tx.strike.create({ data: { memberId, bookingId: booking.id } });
        const after = await blockedState(tx, memberId);
        if (strikeConsequence(after.strikes) === "WARNING") await notify(tx, memberId, "STRIKE_WARNING", { strikes: after.strikes });
        else await applyBlock(tx, memberId, now, !before.blocked);
      } else if (!before.blocked && (await blockedState(tx, memberId)).blocked) {
        await applyBlock(tx, memberId, now, true);
      }
      return;
    }

    // Esente = errore di registrazione: lo strike sparisce. Pagata: lo strike resta.
    if (status === "EXEMPT" && booking.strike) await tx.strike.delete({ where: { id: booking.strike.id } });
    if (before.blocked && !(await blockedState(tx, memberId)).blocked) await notify(tx, memberId, "ACCOUNT_UNBLOCKED");
  });
}

/**
 * Anteprima di "Non pagata": dice se il socio verrebbe bloccato e quante prenotazioni future
 * (CONFIRMED) verrebbero cancellate. Specchio della logica di setPaymentStatus, senza scrivere nulla.
 */
export async function unpaidImpact(db: Db, bookingId: string, now = new Date()): Promise<{ wouldBlock: boolean; futureCount: number }> {
  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { strike: true } });
  if (!booking || !booking.chargeable || booking.paymentStatus === "UNPAID") return { wouldBlock: false, futureCount: 0 };
  const before = await blockedState(db, booking.memberId);
  const strikes = before.strikes + (booking.strike ? 0 : 1);
  const unpaid = before.unpaid + 1;
  const wouldBlock = booking.strike ? !before.blocked && isBlocked(strikes, unpaid) : strikeConsequence(strikes) === "BLOCK";
  const futureCount = wouldBlock
    ? await db.booking.count({ where: { memberId: booking.memberId, status: "CONFIRMED", start: { gt: now } } })
    : 0;
  return { wouldBlock, futureCount };
}

export async function setNoShow(db: Db, bookingId: string, noShow: boolean) {
  const res = await db.booking.updateMany({ where: { id: bookingId }, data: { noShow } });
  if (res.count === 0) fail("NOT_FOUND");
}

/** Il socio è esposto solo con i campi necessari alla lista: niente hash password né sessionVersion. */
export function pendingPayments(db: Db, now = new Date()) {
  return db.booking.findMany({
    where: { paymentStatus: "PENDING", chargeable: true, end: { lte: now } },
    include: { field: true, member: { select: { id: true, firstName: true, lastName: true, email: true } } },
    orderBy: { start: "asc" },
  });
}

export async function memberAccount(db: Db, memberId: string) {
  const [state, debt] = await Promise.all([
    blockedState(db, memberId),
    db.booking.aggregate({ where: { memberId, paymentStatus: "UNPAID" }, _sum: { priceCents: true } }),
  ]);
  return { strikes: state.strikes, unpaid: state.unpaid, debtCents: debt._sum.priceCents ?? 0, blocked: state.blocked };
}
