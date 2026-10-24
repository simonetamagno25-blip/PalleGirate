import { beforeEach, describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { prisma } from "./db";
import { createBooking, updateBooking } from "./bookings";
import { ensureTimedNotifications, listNotifications, markAllRead, markRead, unreadCount } from "./notifications";
import { makeField, makeMember, makeSettings, resetDb } from "../../tests/helpers/db";

const NOW = romeInstant("2026-11-10", 600);
const count = (userId: string, type: string) => prisma.notification.count({ where: { userId, type } });

describe("timed notifications", () => {
  beforeEach(async () => {
    await resetDb();
    await makeSettings({ reminderHours: 24, membershipWarningDays: 15 });
  });

  it("tolerates concurrent runs of the lazy generation", async () => {
    const f = await makeField();
    const m = await makeMember();
    await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId: f.id, start: romeInstant("2026-11-11", 540), slots: 1 }, NOW);
    await Promise.all([ensureTimedNotifications(prisma, m.id, NOW), ensureTimedNotifications(prisma, m.id, NOW), ensureTimedNotifications(prisma, m.id, NOW)]);
    expect(await count(m.id, "BOOKING_REMINDER")).toBe(1);
  });

  it("creates one reminder per booking within the reminder window, idempotently", async () => {
    const f = await makeField();
    const m = await makeMember();
    const soon = await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId: f.id, start: romeInstant("2026-11-11", 540), slots: 1 }, NOW);
    await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId: f.id, start: romeInstant("2026-11-13", 540), slots: 1 }, NOW);
    await ensureTimedNotifications(prisma, m.id, NOW);
    await ensureTimedNotifications(prisma, m.id, NOW);
    expect(await count(m.id, "BOOKING_REMINDER")).toBe(1);
    // Spostata: nuovo promemoria per il nuovo orario.
    await updateBooking(prisma, { userId: m.id, mode: "member" }, soon.id, { fieldId: f.id, start: romeInstant("2026-11-11", 600), slots: 1 }, NOW);
    await ensureTimedNotifications(prisma, m.id, NOW);
    expect(await count(m.id, "BOOKING_REMINDER")).toBe(2);
  });

  it("warns once when the card expires within 15 days, and once when expired", async () => {
    const expiring = await makeMember({ expiryDate: "2026-11-25" });
    const notYet = await makeMember({ expiryDate: "2026-11-26" });
    const expired = await makeMember({ expiryDate: "2026-11-09" });
    for (const u of [expiring, notYet, expired]) {
      await ensureTimedNotifications(prisma, u.id, NOW);
      await ensureTimedNotifications(prisma, u.id, NOW);
    }
    expect(await count(expiring.id, "MEMBERSHIP_EXPIRING")).toBe(1);
    expect(await count(notYet.id, "MEMBERSHIP_EXPIRING")).toBe(0);
    expect(await count(expired.id, "MEMBERSHIP_EXPIRED")).toBe(1);
    expect(await count(expired.id, "MEMBERSHIP_EXPIRING")).toBe(0);
  });

  it("counts, lists and marks as read only the user's own notifications", async () => {
    const a = await makeMember({ expiryDate: "2026-11-09" });
    const b = await makeMember({ expiryDate: "2026-11-09" });
    await ensureTimedNotifications(prisma, a.id, NOW);
    await ensureTimedNotifications(prisma, b.id, NOW);
    const [na] = await listNotifications(prisma, a.id);
    await markRead(prisma, b.id, na.id); // non è sua: nessun effetto
    expect(await unreadCount(prisma, a.id)).toBe(1);
    await markRead(prisma, a.id, na.id);
    expect(await unreadCount(prisma, a.id)).toBe(0);
    await markAllRead(prisma, b.id);
    expect(await unreadCount(prisma, b.id)).toBe(0);
  });
});
