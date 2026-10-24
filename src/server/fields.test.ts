import { beforeEach, describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { prisma } from "./db";
import { DomainError } from "./errors";
import { createBooking } from "./bookings";
import { deactivateField, futureBookingsCount, updateSettings } from "./fields";
import { makeAdmin, makeField, makeMember, makeSettings, resetDb } from "../../tests/helpers/db";

const NOW = romeInstant("2026-11-10", 600);

describe("fields and settings", () => {
  beforeEach(async () => {
    await resetDb();
    await makeSettings();
  });

  it("deactivating a field cancels and notifies only future bookings", async () => {
    const f = await makeField();
    const m = await makeMember();
    const admin = await makeAdmin();
    const past = await prisma.booking.create({ data: { memberId: m.id, fieldId: f.id, start: romeInstant("2026-11-01", 600), end: romeInstant("2026-11-01", 660), slots: 1, priceCents: 1800 } });
    const fut = await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId: f.id, start: romeInstant("2026-11-12", 600), slots: 1 }, NOW);
    expect(await futureBookingsCount(prisma, f.id, NOW)).toBe(1);
    expect(await deactivateField(prisma, admin.id, f.id, NOW)).toBe(1);
    expect((await prisma.field.findUniqueOrThrow({ where: { id: f.id } })).active).toBe(false);
    expect(await prisma.booking.findUniqueOrThrow({ where: { id: fut.id } })).toMatchObject({ status: "CANCELLED", chargeable: false, cancelledById: admin.id });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: past.id } })).status).toBe("CONFIRMED");
    expect(await prisma.notification.count({ where: { userId: m.id, type: "BOOKING_CANCELLED" } })).toBe(1);
    expect(await prisma.fieldOccupancy.count({ where: { bookingId: fut.id } })).toBe(0);
  });

  it("validates settings", async () => {
    const base = { openMinutes: 480, closeMinutes: 1380, startStepMinutes: 15, maxAdvanceDays: 14, maxActiveBookings: 3, changeWindowMinutes: 120, maxSlotsPerBooking: 2, membershipWarningDays: 15, reminderHours: 24 };
    expect((await updateSettings(prisma, { ...base, maxAdvanceDays: 21 })).maxAdvanceDays).toBe(21);
    const bad = await updateSettings(prisma, { ...base, closeMinutes: 400 }).then(() => null, (e) => e);
    expect(bad).toBeInstanceOf(DomainError);
    const badStep = await updateSettings(prisma, { ...base, startStepMinutes: 7 }).then(() => null, (e) => e);
    expect(badStep).toBeInstanceOf(DomainError);
    // occupancy is modeled in 15-minute quarters: finer steps are rejected
    const step5 = await updateSettings(prisma, { ...base, startStepMinutes: 5 }).then(() => null, (e) => e);
    expect(step5).toBeInstanceOf(DomainError);
    expect((await updateSettings(prisma, { ...base, startStepMinutes: 30 })).startStepMinutes).toBe(30);
    // close time must be on a quarter-hour boundary
    const badClose = await updateSettings(prisma, { ...base, closeMinutes: 1370 }).then(() => null, (e) => e);
    expect(badClose).toBeInstanceOf(DomainError);
  });
});
