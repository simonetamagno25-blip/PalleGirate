import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { makeField, makeMember, resetDb } from "../../tests/helpers/db";

describe("FieldOccupancy primary key", () => {
  beforeEach(resetDb);

  it("rejects two rows for the same field and quarter", async () => {
    const field = await makeField();
    const member = await makeMember();
    const start = new Date("2026-11-02T09:00:00Z");
    const mk = () =>
      prisma.booking.create({
        data: { memberId: member.id, fieldId: field.id, start, end: new Date("2026-11-02T10:00:00Z"), slots: 1, priceCents: 1800 },
      });
    const a = await mk();
    const b = await mk();
    await prisma.fieldOccupancy.create({ data: { fieldId: field.id, quarterStart: start, bookingId: a.id } });
    await expect(
      prisma.fieldOccupancy.create({ data: { fieldId: field.id, quarterStart: start, bookingId: b.id } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
