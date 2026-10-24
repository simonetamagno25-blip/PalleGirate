import { describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { hourHistogram, occupancyByField, rangeBounds, revenueSummary } from "./admin";
import type { StatBooking } from "./member";

const b = (fieldId: string, day: string, startMin: number, minutes: number, o: Partial<StatBooking> = {}): StatBooking => ({
  sport: "TENNIS", fieldId, start: romeInstant(day, startMin), end: romeInstant(day, startMin + minutes), status: "CONFIRMED",
  chargeable: true, paymentStatus: "PENDING", priceCents: 1000, noShow: false, ...o,
});

describe("admin stats", () => {
  it("computes range bounds with weeks starting on Monday", () => {
    expect(rangeBounds("day", "2026-11-11")).toEqual({ from: "2026-11-11", to: "2026-11-12" });
    expect(rangeBounds("week", "2026-11-11")).toEqual({ from: "2026-11-09", to: "2026-11-16" }); // mercoledì → lunedì 9
    expect(rangeBounds("week", "2026-11-15")).toEqual({ from: "2026-11-09", to: "2026-11-16" }); // domenica
    expect(rangeBounds("month", "2026-11-11")).toEqual({ from: "2026-11-01", to: "2026-12-01" });
  });

  it("computes occupancy per field over open hours", () => {
    const fields = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
    // 1 giorno, 08–23 = 900 minuti aperti
    const r = occupancyByField([b("a", "2026-11-11", 600, 450), b("a", "2026-11-11", 480, 60, { status: "CANCELLED" }), b("b", "2026-11-12", 600, 60)], fields, "2026-11-11", "2026-11-12", 480, 1380);
    expect(r).toEqual([{ fieldId: "a", name: "A", rate: 0.5 }, { fieldId: "b", name: "B", rate: 0 }]);
  });

  it("sums expected, collected and unpaid revenue", () => {
    const now = romeInstant("2026-11-20", 600);
    const r = revenueSummary(
      [
        b("a", "2026-11-01", 600, 60, { paymentStatus: "PAID", priceCents: 1800 }),
        b("a", "2026-11-02", 600, 60, { paymentStatus: "UNPAID", priceCents: 2500 }),
        b("a", "2026-11-03", 600, 60, { paymentStatus: "EXEMPT", priceCents: 1000 }),
        b("a", "2026-11-04", 600, 60, { status: "CANCELLED", chargeable: false, priceCents: 6000 }),
        b("a", "2026-11-05", 600, 60, { status: "CANCELLED", chargeable: true, priceCents: 1000 }),
        b("a", "2026-11-30", 600, 60, { priceCents: 9999 }), // futura
      ],
      now,
    );
    expect(r).toEqual({ expectedCents: 1800 + 2500 + 1000, collectedCents: 1800, unpaidCents: 2500 });
  });

  it("builds a weekday × hour histogram in Rome time", () => {
    const h = hourHistogram([b("a", "2026-11-09", 18 * 60, 60), b("a", "2026-11-16", 18 * 60 + 30, 60), b("a", "2026-11-10", 9 * 60, 60, { status: "CANCELLED" })]);
    expect(h).toEqual([{ weekday: 0, hour: 18, count: 2 }]);
  });
});
