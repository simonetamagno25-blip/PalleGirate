import { beforeEach, describe, expect, it } from "vitest";
import type { ViolationCode } from "@/lib/booking-rules";
import { romeInstant } from "@/lib/time/rome";
import { prisma, type Db, type Tx } from "./db";
import { DomainError } from "./errors";
import { cancelBooking, createBooking, updateBooking, type Actor } from "./bookings";
import { makeAdmin, makeField, makeMember, makeSettings, resetDb } from "../../tests/helpers/db";

const NOW = romeInstant("2026-11-02", 10 * 60); // lunedì 10:00 Roma
const at = (day: string, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return romeInstant(day, h * 60 + m);
};
const asMember = (id: string): Actor => ({ userId: id, mode: "member" });
const asAdmin = (id: string): Actor => ({ userId: id, mode: "admin" });

async function expectCode(p: Promise<unknown>, code: ViolationCode) {
  const err = await p.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(DomainError);
  expect((err as DomainError).violations.map((v) => v.code)).toContain(code);
}

describe("booking service", () => {
  beforeEach(async () => {
    await resetDb();
    await makeSettings();
  });

  it("creates a booking with price and one occupancy row per quarter", async () => {
    const field = await makeField({ priceCents: 1800 });
    const m = await makeMember();
    const b = await createBooking(prisma, asMember(m.id), m.id, { fieldId: field.id, start: at("2026-11-05", "10:00"), slots: 2 }, NOW);
    expect(b.status).toBe("CONFIRMED");
    expect(b.priceCents).toBe(3600);
    expect(b.end.getTime()).toBe(at("2026-11-05", "12:00").getTime());
    expect(await prisma.fieldOccupancy.count({ where: { bookingId: b.id } })).toBe(8);
    expect(await prisma.notification.count({ where: { userId: m.id, type: "BOOKING_CREATED" } })).toBe(1);
  });

  it("rejects overlaps on the same field, allows back-to-back and other fields", async () => {
    const f1 = await makeField();
    const f2 = await makeField();
    const a = await makeMember();
    const b = await makeMember();
    await createBooking(prisma, asMember(a.id), a.id, { fieldId: f1.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW);
    await expectCode(createBooking(prisma, asMember(b.id), b.id, { fieldId: f1.id, start: at("2026-11-05", "10:45"), slots: 1 }, NOW), "SLOT_TAKEN");
    await createBooking(prisma, asMember(b.id), b.id, { fieldId: f1.id, start: at("2026-11-05", "11:00"), slots: 1 }, NOW);
    await createBooking(prisma, asMember(b.id), b.id, { fieldId: f2.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW);
  });

  it("lets only one of two simultaneous requests win", async () => {
    const f = await makeField();
    const a = await makeMember();
    const b = await makeMember();
    const input = { fieldId: f.id, start: at("2026-11-05", "18:00"), slots: 1 };
    const results = await Promise.allSettled([
      createBooking(prisma, asMember(a.id), a.id, input, NOW),
      createBooking(prisma, asMember(b.id), b.id, input, NOW),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(DomainError);
    expect((rejected.reason as DomainError).violations[0].code).toBe("SLOT_TAKEN");
    expect(await prisma.booking.count()).toBe(1);
  });

  it("enforces max 3 active bookings but lets a member modify one of them", async () => {
    const f = await makeField();
    const m = await makeMember();
    const made = [];
    for (const t of ["09:00", "10:00", "11:00"]) {
      made.push(await createBooking(prisma, asMember(m.id), m.id, { fieldId: f.id, start: at("2026-11-05", t), slots: 1 }, NOW));
    }
    await expectCode(createBooking(prisma, asMember(m.id), m.id, { fieldId: f.id, start: at("2026-11-05", "15:00"), slots: 1 }, NOW), "TOO_MANY_ACTIVE");
    const moved = await updateBooking(prisma, asMember(m.id), made[0].id, { fieldId: f.id, start: at("2026-11-06", "09:00"), slots: 1 }, NOW);
    expect(moved.start.getTime()).toBe(at("2026-11-06", "09:00").getTime());
  });

  it("moves a booking by 15 minutes overlapping itself", async () => {
    const f = await makeField();
    const m = await makeMember();
    const b = await createBooking(prisma, asMember(m.id), m.id, { fieldId: f.id, start: at("2026-11-05", "10:00"), slots: 2 }, NOW);
    const moved = await updateBooking(prisma, asMember(m.id), b.id, { fieldId: f.id, start: at("2026-11-05", "10:15"), slots: 2 }, NOW);
    expect(moved.end.getTime()).toBe(at("2026-11-05", "12:15").getTime());
    expect(await prisma.fieldOccupancy.count({ where: { bookingId: b.id } })).toBe(8);
  });

  it("moving to another field frees the old slot and recalculates the price", async () => {
    const tennis = await makeField({ priceCents: 1800 });
    const football = await makeField({ sport: "FOOTBALL", slotMinutes: 90, priceCents: 6000 });
    const a = await makeMember();
    const b = await makeMember();
    const booking = await createBooking(prisma, asMember(a.id), a.id, { fieldId: tennis.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW);
    const moved = await updateBooking(prisma, asMember(a.id), booking.id, { fieldId: football.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW);
    expect(moved.priceCents).toBe(6000);
    await createBooking(prisma, asMember(b.id), b.id, { fieldId: tennis.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW);
  });

  it("closes member changes 2 hours before the original start", async () => {
    const f = await makeField();
    const m = await makeMember();
    const b = await createBooking(prisma, asMember(m.id), m.id, { fieldId: f.id, start: at("2026-11-02", "12:00"), slots: 1 }, NOW);
    // NOW è esattamente 2 ore prima: si può ancora
    await updateBooking(prisma, asMember(m.id), b.id, { fieldId: f.id, start: at("2026-11-02", "12:15"), slots: 1 }, NOW);
    const later = new Date(NOW.getTime() + 20 * 60_000);
    await expectCode(updateBooking(prisma, asMember(m.id), b.id, { fieldId: f.id, start: at("2026-11-03", "12:00"), slots: 1 }, later), "CHANGE_WINDOW_CLOSED");
    await expectCode(cancelBooking(prisma, asMember(m.id), b.id, undefined, later), "CHANGE_WINDOW_CLOSED");
  });

  it("member cancellation in time is free and frees the slot", async () => {
    const f = await makeField();
    const m = await makeMember();
    const b = await createBooking(prisma, asMember(m.id), m.id, { fieldId: f.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW);
    const c = await cancelBooking(prisma, asMember(m.id), b.id, "  ", NOW);
    expect(c.status).toBe("CANCELLED");
    expect(c.chargeable).toBe(false);
    expect(c.cancelReason).toBeNull();
    expect(await prisma.fieldOccupancy.count({ where: { bookingId: b.id } })).toBe(0);
    await expectCode(cancelBooking(prisma, asMember(m.id), b.id, undefined, NOW), "ALREADY_CANCELLED");
  });

  it("admin late cancellation stays chargeable, early one does not", async () => {
    const f = await makeField();
    const m = await makeMember();
    const admin = await makeAdmin();
    const soon = await createBooking(prisma, asMember(m.id), m.id, { fieldId: f.id, start: at("2026-11-02", "11:00"), slots: 1 }, NOW);
    const far = await createBooking(prisma, asMember(m.id), m.id, { fieldId: f.id, start: at("2026-11-05", "11:00"), slots: 1 }, NOW);
    expect((await cancelBooking(prisma, asAdmin(admin.id), soon.id, "Campo allagato", NOW)).chargeable).toBe(true);
    expect((await cancelBooking(prisma, asAdmin(admin.id), far.id, undefined, NOW)).chargeable).toBe(false);
    const n = await prisma.notification.findFirst({ where: { userId: m.id, type: "BOOKING_CANCELLED", params: { contains: "Campo allagato" } } });
    expect(JSON.parse(n!.params)).toMatchObject({ by: "admin", reason: "Campo allagato", chargeable: 1 });
  });

  it("admin bypasses member rules but not overlaps or opening hours", async () => {
    const f = await makeField();
    const expired = await makeMember({ expiryDate: "2026-01-01" });
    const other = await makeMember();
    const admin = await makeAdmin();
    await createBooking(prisma, asAdmin(admin.id), expired.id, { fieldId: f.id, start: at("2026-12-20", "10:00"), slots: 1 }, NOW);
    await expectCode(createBooking(prisma, asAdmin(admin.id), other.id, { fieldId: f.id, start: at("2026-12-20", "10:30"), slots: 1 }, NOW), "SLOT_TAKEN");
    await expectCode(createBooking(prisma, asAdmin(admin.id), other.id, { fieldId: f.id, start: at("2026-12-20", "07:00"), slots: 1 }, NOW), "BEFORE_OPENING");
  });

  it("blocked members cannot book", async () => {
    const f = await makeField();
    const m = await makeMember();
    for (const day of ["2026-10-01", "2026-10-02"]) {
      const old = await prisma.booking.create({
        data: { memberId: m.id, fieldId: f.id, start: at(day, "10:00"), end: at(day, "11:00"), slots: 1, priceCents: 1800, paymentStatus: "UNPAID" },
      });
      await prisma.strike.create({ data: { memberId: m.id, bookingId: old.id } });
    }
    await expectCode(createBooking(prisma, asMember(m.id), m.id, { fieldId: f.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW), "BLOCKED");
  });

  it("a member cannot book for, change or cancel someone else's booking", async () => {
    const f = await makeField();
    const a = await makeMember();
    const b = await makeMember();
    await expectCode(createBooking(prisma, asMember(a.id), b.id, { fieldId: f.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW), "FORBIDDEN");
    const bk = await createBooking(prisma, asMember(b.id), b.id, { fieldId: f.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW);
    await expectCode(updateBooking(prisma, asMember(a.id), bk.id, { fieldId: f.id, start: at("2026-11-05", "12:00"), slots: 1 }, NOW), "FORBIDDEN");
    await expectCode(cancelBooking(prisma, asMember(a.id), bk.id, undefined, NOW), "FORBIDDEN");
  });

  it("maps the primary-key violation on FieldOccupancy to SLOT_TAKEN and rolls back", async () => {
    const f = await makeField();
    const a = await makeMember();
    const b = await makeMember();
    await createBooking(prisma, asMember(a.id), a.id, { fieldId: f.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW);
    // Salta il controllo preventivo: l'unico argine rimasto è la chiave primaria (P2002).
    const bind = <T extends object>(o: T, k: string | symbol) => {
      const v = Reflect.get(o, k);
      return typeof v === "function" ? v.bind(o) : v;
    };
    const proxyDb = new Proxy(prisma, {
      get(target, prop) {
        if (prop !== "$transaction") return bind(target, prop);
        return (fn: (tx: Tx) => Promise<unknown>) =>
          target.$transaction((tx) =>
            fn(
              new Proxy(tx, {
                get(t, p) {
                  if (p !== "fieldOccupancy") return bind(t, p);
                  return new Proxy(t.fieldOccupancy, {
                    get: (o, q) => (q === "findFirst" ? async () => null : bind(o, q)),
                  });
                },
              }),
            ),
          );
      },
    }) as Db;
    await expectCode(createBooking(proxyDb, asMember(b.id), b.id, { fieldId: f.id, start: at("2026-11-05", "10:30"), slots: 1 }, NOW), "SLOT_TAKEN");
    expect(await prisma.booking.count()).toBe(1);
  });
});
