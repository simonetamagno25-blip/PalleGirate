import { beforeEach, describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { prisma } from "./db";
import { createBooking, cancelBooking } from "./bookings";
import { busyForField, getDayAvailability, getDayBoard } from "./availability";
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
    const created = await createBooking(prisma, { userId: a.id, mode: "member" }, a.id, { fieldId: f.id, start: romeInstant("2026-11-05", 600), slots: 1 }, NOW);

    const forB = await getDayAvailability(prisma, "2026-11-05", { userId: b.id, isAdmin: false });
    expect(forB.bookings).toHaveLength(1);
    expect(forB.bookings[0].id).not.toBe(created.id);
    expect(JSON.stringify(forB)).not.toContain(created.id);
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

  it("builds the day board: free starts per active field, no past starts today, no names for members", async () => {
    const f = await makeField();
    const off = await makeField({ active: false });
    const a = await makeMember();
    const b = await makeMember();
    await createBooking(prisma, { userId: a.id, mode: "member" }, a.id, { fieldId: f.id, start: romeInstant("2026-11-02", 720), slots: 1 }, NOW);
    await createBooking(prisma, { userId: b.id, mode: "member" }, b.id, { fieldId: f.id, start: romeInstant("2026-11-02", 840), slots: 1 }, NOW);

    const board = await getDayBoard(prisma, "2026-11-02", { userId: a.id, isAdmin: false }, NOW);
    expect(board.rows.map((r) => r.id)).toEqual([f.id]);
    expect(board.rows.map((r) => r.id)).not.toContain(off.id);
    const row = board.rows[0];
    // NOW is 10:00: 10:00 itself and earlier starts are gone.
    expect(row.starts[0]).toBe(615);
    expect(row.starts).not.toContain(720);
    expect(row.starts).not.toContain(690); // 11:30–12:30 would overlap the 12:00 booking
    expect(row.starts).toContain(660);
    expect(row.bookings.map((x) => x.mine)).toEqual([true, false]);
    expect(JSON.stringify(board)).not.toContain(b.lastName);

    const past = await getDayBoard(prisma, "2026-11-01", { userId: a.id, isAdmin: false }, NOW);
    expect(past.rows[0].starts).toEqual([]);
  });
});
