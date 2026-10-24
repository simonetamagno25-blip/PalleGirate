import { beforeEach, describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { prisma } from "./db";
import { DomainError } from "./errors";
import { createBooking, cancelBooking } from "./bookings";
import { memberAccount, pendingPayments, setNoShow, setPaymentStatus } from "./payments";
import { makeAdmin, makeField, makeMember, makeSettings, resetDb } from "../../tests/helpers/db";

const NOW = romeInstant("2026-11-10", 12 * 60);
let fieldId: string;

/** Prenotazione già conclusa, creata direttamente nel DB. */
async function pastBooking(memberId: string, day: string) {
  return prisma.booking.create({
    data: { memberId, fieldId, start: romeInstant(day, 600), end: romeInstant(day, 660), slots: 1, priceCents: 1800 },
  });
}
const types = async (userId: string) => (await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "asc" } })).map((n) => n.type);
/** Codici di violazione del rifiuto di dominio (o l'errore grezzo, se non è un DomainError). */
const violationCodes = (p: Promise<unknown>) => p.then(() => null, (x) => (x instanceof DomainError ? x.violations.map((v) => v.code) : x));

describe("payments and strikes", () => {
  beforeEach(async () => {
    await resetDb();
    await makeSettings();
    fieldId = (await makeField()).id;
  });

  it("first unpaid booking gives a warning, not a block", async () => {
    const m = await makeMember();
    const b = await pastBooking(m.id, "2026-11-01");
    await setPaymentStatus(prisma, b.id, "UNPAID", NOW);
    expect(await memberAccount(prisma, m.id)).toEqual({ strikes: 1, unpaid: 1, debtCents: 1800, blocked: false });
    expect(await types(m.id)).toContain("STRIKE_WARNING");
  });

  it("second unpaid booking blocks and cancels future bookings only", async () => {
    const m = await makeMember();
    const b1 = await pastBooking(m.id, "2026-11-01");
    const b2 = await pastBooking(m.id, "2026-11-02");
    const future = await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId, start: romeInstant("2026-11-12", 600), slots: 1 }, NOW);
    // Prenotazione in corso adesso: non va toccata.
    const ongoing = await prisma.booking.create({
      data: { memberId: m.id, fieldId, start: romeInstant("2026-11-10", 690), end: romeInstant("2026-11-10", 750), slots: 1, priceCents: 1800 },
    });
    await setPaymentStatus(prisma, b1.id, "UNPAID", NOW);
    await setPaymentStatus(prisma, b2.id, "UNPAID", NOW);

    const acc = await memberAccount(prisma, m.id);
    expect(acc).toMatchObject({ strikes: 2, unpaid: 2, debtCents: 3600, blocked: true });
    const f = await prisma.booking.findUniqueOrThrow({ where: { id: future.id } });
    expect(f).toMatchObject({ status: "CANCELLED", chargeable: false, cancelledById: null });
    expect(await prisma.fieldOccupancy.count({ where: { bookingId: future.id } })).toBe(0);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: ongoing.id } })).status).toBe("CONFIRMED");
    expect(await types(m.id)).toEqual(expect.arrayContaining(["ACCOUNT_BLOCKED", "BOOKING_CANCELLED_BLOCK"]));
  });

  it("unblocks only when every unpaid booking is paid, strikes stay", async () => {
    const m = await makeMember();
    const b1 = await pastBooking(m.id, "2026-11-01");
    const b2 = await pastBooking(m.id, "2026-11-02");
    await setPaymentStatus(prisma, b1.id, "UNPAID", NOW);
    await setPaymentStatus(prisma, b2.id, "UNPAID", NOW);
    await setPaymentStatus(prisma, b1.id, "PAID", NOW);
    expect((await memberAccount(prisma, m.id)).blocked).toBe(true);
    await setPaymentStatus(prisma, b2.id, "PAID", NOW);
    expect(await memberAccount(prisma, m.id)).toEqual({ strikes: 2, unpaid: 0, debtCents: 0, blocked: false });
    expect(await types(m.id)).toContain("ACCOUNT_UNBLOCKED");
  });

  it("a third unpaid booking blocks again immediately", async () => {
    const m = await makeMember();
    const [b1, b2, b3] = [await pastBooking(m.id, "2026-11-01"), await pastBooking(m.id, "2026-11-02"), await pastBooking(m.id, "2026-11-03")];
    for (const b of [b1, b2]) await setPaymentStatus(prisma, b.id, "UNPAID", NOW);
    for (const b of [b1, b2]) await setPaymentStatus(prisma, b.id, "PAID", NOW);
    const future = await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId, start: romeInstant("2026-11-12", 600), slots: 1 }, NOW);
    await setPaymentStatus(prisma, b3.id, "UNPAID", NOW);
    expect(await memberAccount(prisma, m.id)).toMatchObject({ strikes: 3, blocked: true });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: future.id } })).status).toBe("CANCELLED");
  });

  it("correcting UNPAID to EXEMPT removes the strike", async () => {
    const m = await makeMember();
    const b = await pastBooking(m.id, "2026-11-01");
    await setPaymentStatus(prisma, b.id, "UNPAID", NOW);
    await setPaymentStatus(prisma, b.id, "EXEMPT", NOW);
    expect(await memberAccount(prisma, m.id)).toEqual({ strikes: 0, unpaid: 0, debtCents: 0, blocked: false });
  });

  it("re-marking UNPAID does not add a second strike for the same booking", async () => {
    const m = await makeMember();
    const b = await pastBooking(m.id, "2026-11-01");
    await setPaymentStatus(prisma, b.id, "UNPAID", NOW);
    await setPaymentStatus(prisma, b.id, "PAID", NOW);
    await setPaymentStatus(prisma, b.id, "UNPAID", NOW);
    expect((await memberAccount(prisma, m.id)).strikes).toBe(1);
  });

  it("lists ended chargeable bookings to record, including late admin cancellations", async () => {
    const m = await makeMember();
    const admin = await makeAdmin();
    const ended = await pastBooking(m.id, "2026-11-01");
    const late = await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId, start: romeInstant("2026-11-10", 13 * 60), slots: 1 }, NOW);
    await cancelBooking(prisma, { userId: admin.id, mode: "admin" }, late.id, "Pioggia", NOW);
    const free = await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId, start: romeInstant("2026-11-10", 18 * 60), slots: 1 }, NOW);
    await cancelBooking(prisma, { userId: m.id, mode: "member" }, free.id, undefined, NOW);

    const later = romeInstant("2026-11-10", 21 * 60);
    const ids = (await pendingPayments(prisma, later)).map((b) => b.id);
    expect(ids).toContain(ended.id);
    expect(ids).toContain(late.id);
    expect(ids).not.toContain(free.id);
    expect((await pendingPayments(prisma, NOW)).map((b) => b.id)).not.toContain(late.id); // non ancora finita
    const [row] = await pendingPayments(prisma, later); // il più vecchio è `ended`
    expect(Object.keys(row.member).sort()).toEqual(["email", "firstName", "id", "lastName"]);
  });

  it("refuses to record bookings that are not finished, not chargeable, or missing", async () => {
    const m = await makeMember();
    const future = await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId, start: romeInstant("2026-11-12", 600), slots: 1 }, NOW);
    const notChargeable = await pastBooking(m.id, "2026-11-01");
    await prisma.booking.update({ where: { id: notChargeable.id }, data: { chargeable: false } });
    expect(await violationCodes(setPaymentStatus(prisma, future.id, "PAID", NOW))).toEqual(["INVALID_INPUT"]);
    expect(await violationCodes(setPaymentStatus(prisma, notChargeable.id, "PAID", NOW))).toEqual(["INVALID_INPUT"]);
    expect(await violationCodes(setPaymentStatus(prisma, "missing-id", "PAID", NOW))).toEqual(["NOT_FOUND"]);
  });

  it("an already blocked member gets one ACCOUNT_BLOCKED, but later bookings are still cancelled", async () => {
    const m = await makeMember();
    const admin = await makeAdmin();
    const [b1, b2, b3] = [await pastBooking(m.id, "2026-11-01"), await pastBooking(m.id, "2026-11-02"), await pastBooking(m.id, "2026-11-03")];
    await setPaymentStatus(prisma, b1.id, "UNPAID", NOW);
    await setPaymentStatus(prisma, b2.id, "UNPAID", NOW); // blocco: ACCOUNT_BLOCKED
    // Prenotazione futura inserita dall'admin mentre il socio è già bloccato.
    const later = await createBooking(prisma, { userId: admin.id, mode: "admin" }, m.id, { fieldId, start: romeInstant("2026-11-12", 600), slots: 1 }, NOW);
    await setPaymentStatus(prisma, b3.id, "UNPAID", NOW);
    expect((await types(m.id)).filter((t) => t === "ACCOUNT_BLOCKED")).toHaveLength(1);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: later.id } })).status).toBe("CANCELLED");
    expect(await memberAccount(prisma, m.id)).toMatchObject({ strikes: 3, blocked: true });
  });

  it("re-marking a strike-holding booking UNPAID after unblocking re-blocks without a second strike", async () => {
    const m = await makeMember();
    const b1 = await pastBooking(m.id, "2026-11-01");
    const b2 = await pastBooking(m.id, "2026-11-02");
    await setPaymentStatus(prisma, b1.id, "UNPAID", NOW);
    await setPaymentStatus(prisma, b2.id, "UNPAID", NOW);
    await setPaymentStatus(prisma, b1.id, "PAID", NOW);
    await setPaymentStatus(prisma, b2.id, "PAID", NOW);
    const future = await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId, start: romeInstant("2026-11-12", 600), slots: 1 }, NOW);
    await setPaymentStatus(prisma, b1.id, "UNPAID", NOW);
    expect(await memberAccount(prisma, m.id)).toMatchObject({ strikes: 2, unpaid: 1, blocked: true });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: future.id } })).status).toBe("CANCELLED");
    expect((await types(m.id)).filter((t) => t === "ACCOUNT_BLOCKED")).toHaveLength(2);
  });

  it("no-show on a missing booking is NOT_FOUND, otherwise it sets the flag", async () => {
    const m = await makeMember();
    const b = await pastBooking(m.id, "2026-11-01");
    await setNoShow(prisma, b.id, true);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).noShow).toBe(true);
    expect(await violationCodes(setNoShow(prisma, "missing-id", true))).toEqual(["NOT_FOUND"]);
  });
});
