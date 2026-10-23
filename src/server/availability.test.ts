import { beforeEach, describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { prisma } from "./db";
import { createBooking, cancelBooking } from "./bookings";
import { busyForField, getDayAvailability } from "./availability";
import { makeField, makeMember, makeSettings, resetDb } from "../../tests/helpers/db";

const NOW = romeInstant("2026-11-02", 600);

describe("availability", () => {
  beforeEach(async () => {
    await resetDb();
    await makeSettings();
  });

  it("hides other members' identity from members and shows it to admins", async () => {
    const f = await makeField();
    const a = await makeMember();
    const b = await makeMember();
    await createBooking(prisma, { userId: a.id, mode: "member" }, a.id, { fieldId: f.id, start: romeInstant("2026-11-05", 600), slots: 1 }, NOW);

    const forB = await getDayAvailability(prisma, "2026-11-05", { userId: b.id, isAdmin: false });
    expect(forB.bookings).toHaveLength(1);
    expect(forB.bookings[0]).toEqual({ id: expect.any(String), fieldId: f.id, startMin: 600, endMin: 660, mine: false });
    expect(JSON.stringify(forB)).not.toContain(a.lastName);

    const forA = await getDayAvailability(prisma, "2026-11-05", { userId: a.id, isAdmin: false });
    expect(forA.bookings[0].mine).toBe(true);

    const forAdmin = await getDayAvailability(prisma, "2026-11-05", { userId: b.id, isAdmin: true });
    expect(forAdmin.bookings[0].memberName).toBe(`${a.firstName} ${a.lastName}`);
  });

  it("ignores cancelled bookings and other days", async () => {
    const f = await makeField();
    const a = await makeMember();
    const bk = await createBooking(prisma, { userId: a.id, mode: "member" }, a.id, { fieldId: f.id, start: romeInstant("2026-11-05", 600), slots: 1 }, NOW);
    await createBooking(prisma, { userId: a.id, mode: "member" }, a.id, { fieldId: f.id, start: romeInstant("2026-11-06", 600), slots: 1 }, NOW);
    await cancelBooking(prisma, { userId: a.id, mode: "member" }, bk.id, undefined, NOW);
    expect((await getDayAvailability(prisma, "2026-11-05", { userId: a.id, isAdmin: false })).bookings).toHaveLength(0);
    expect(await busyForField(prisma, f.id, "2026-11-06")).toEqual([{ startMin: 600, endMin: 660 }]);
  });
});
