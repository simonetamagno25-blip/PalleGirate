import { addDays, diffDays, romeDay, romeMinutesOfDay } from "@/lib/time/rome";
import type { StatBooking } from "./member";

export type Range = "day" | "week" | "month";

/** 0 = lunedì … 6 = domenica, per un giorno di calendario. */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function rangeBounds(range: Range, today: string): { from: string; to: string } {
  if (range === "day") return { from: today, to: addDays(today, 1) };
  if (range === "week") {
    const from = addDays(today, -weekdayOf(today));
    return { from, to: addDays(from, 7) };
  }
  const [y, m] = today.split("-").map(Number);
  const from = `${today.slice(0, 7)}-01`;
  return { from, to: new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10) };
}

export function occupancyByField(bookings: StatBooking[], fields: { id: string; name: string }[], from: string, to: string, open: number, close: number) {
  const available = diffDays(from, to) * (close - open);
  return fields.map((f) => {
    const used = bookings
      .filter((x) => x.fieldId === f.id && x.status === "CONFIRMED" && romeDay(x.start) >= from && romeDay(x.start) < to)
      .reduce((s, x) => s + (x.end.getTime() - x.start.getTime()) / 60_000, 0);
    return { fieldId: f.id, name: f.name, rate: available > 0 ? Math.round((used / available) * 1000) / 1000 : 0 };
  });
}

export function revenueSummary(bookings: StatBooking[], now: Date) {
  let expectedCents = 0, collectedCents = 0, unpaidCents = 0;
  for (const x of bookings) {
    if (!x.chargeable || x.end > now || x.paymentStatus === "EXEMPT") continue;
    expectedCents += x.priceCents;
    if (x.paymentStatus === "PAID") collectedCents += x.priceCents;
    if (x.paymentStatus === "UNPAID") unpaidCents += x.priceCents;
  }
  return { expectedCents, collectedCents, unpaidCents };
}

export function hourHistogram(bookings: StatBooking[]) {
  const acc = new Map<string, number>();
  for (const x of bookings) {
    if (x.status !== "CONFIRMED") continue;
    const key = `${weekdayOf(romeDay(x.start))}:${Math.floor(romeMinutesOfDay(x.start) / 60)}`;
    acc.set(key, (acc.get(key) ?? 0) + 1);
  }
  return [...acc].map(([k, count]) => {
    const [weekday, hour] = k.split(":").map(Number);
    return { weekday, hour, count };
  });
}
