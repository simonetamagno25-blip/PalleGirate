import { describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { bookingsByMonth, hoursBySport, lastMonths, type StatBooking } from "./member";

const b = (sport: string, day: string, minutes: number, o: Partial<StatBooking> = {}): StatBooking => ({
  sport, fieldId: sport, start: romeInstant(day, 600), end: romeInstant(day, 600 + minutes), status: "CONFIRMED",
  chargeable: true, paymentStatus: "PAID", priceCents: 1000, noShow: false, ...o,
});
const NOW = romeInstant("2026-11-10", 600);

describe("member stats", () => {
  it("sums played hours per sport, ignoring cancelled and future bookings", () => {
    const r = hoursBySport([b("TENNIS", "2026-11-01", 60), b("TENNIS", "2026-11-02", 120), b("FOOTBALL", "2026-11-03", 90), b("TENNIS", "2026-11-04", 60, { status: "CANCELLED" }), b("BOCCE", "2026-11-20", 60)], NOW);
    expect(r).toEqual([{ sport: "TENNIS", hours: 3 }, { sport: "FOOTBALL", hours: 1.5 }]);
  });
  it("counts bookings per Rome month, with empty months as 0", () => {
    // 01/11 00:30 a Roma è già novembre, anche se in UTC è ancora il 31/10 alle 23:30.
    const earlyNov = { ...b("TENNIS", "2026-11-01", 30), start: romeInstant("2026-11-01", 30) };
    expect(bookingsByMonth([earlyNov, b("TENNIS", "2026-10-15", 60)], ["2026-09", "2026-10", "2026-11"])).toEqual([
      { month: "2026-09", count: 0 }, { month: "2026-10", count: 1 }, { month: "2026-11", count: 1 },
    ]);
  });
  it("lists the last n months ending with the current one", () => {
    expect(lastMonths("2026-02-15", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});
