import { beforeEach, describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { prisma } from "./db";
import { listBookings, parseBookingFilters } from "./admin-bookings";
import { makeField, makeMember, resetDb } from "../../tests/helpers/db";

describe("admin booking list", () => {
  beforeEach(resetDb);

  it("parses only valid filter values", () => {
    expect(parseBookingFilters({ status: "CONFIRMED", payment: "NOPE", from: "2026-11-01", to: "x", fieldId: "f1" })).toEqual({ status: "CONFIRMED", from: "2026-11-01", fieldId: "f1" });
  });

  it("filters by field, member, status and Rome day range (inclusive)", async () => {
    const f1 = await makeField();
    const f2 = await makeField();
    const m = await makeMember();
    const mk = (fieldId: string, day: string, status = "CONFIRMED") =>
      prisma.booking.create({ data: { memberId: m.id, fieldId, start: romeInstant(day, 600), end: romeInstant(day, 660), slots: 1, priceCents: 1800, status } });
    const a = await mk(f1.id, "2026-11-01");
    const b = await mk(f1.id, "2026-11-03", "CANCELLED");
    await mk(f2.id, "2026-11-04");
    expect((await listBookings(prisma, { fieldId: f1.id })).map((x) => x.id).sort()).toEqual([a.id, b.id].sort());
    expect((await listBookings(prisma, { status: "CANCELLED" })).map((x) => x.id)).toEqual([b.id]);
    expect((await listBookings(prisma, { from: "2026-11-03", to: "2026-11-03" })).map((x) => x.id)).toEqual([b.id]);
    expect(await listBookings(prisma, { memberId: "nessuno" })).toHaveLength(0);
  });

  it("does not expose credential fields of the member", async () => {
    const f = await makeField();
    const m = await makeMember();
    await prisma.booking.create({ data: { memberId: m.id, fieldId: f.id, start: romeInstant("2026-11-01", 600), end: romeInstant("2026-11-01", 660), slots: 1, priceCents: 1800 } });
    const [row] = await listBookings(prisma, {});
    expect(Object.keys(row.member).sort()).toEqual(["firstName", "id", "lastName"]);
  });
});
