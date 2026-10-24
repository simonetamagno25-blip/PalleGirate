import { romeDay } from "@/lib/time/rome";

export type StatBooking = {
  sport: string;
  fieldId: string;
  start: Date;
  end: Date;
  status: string;
  chargeable: boolean;
  paymentStatus: string;
  priceCents: number;
  noShow: boolean;
};

export function hoursBySport(bookings: StatBooking[], now: Date) {
  const acc = new Map<string, number>();
  for (const x of bookings) {
    if (x.status !== "CONFIRMED" || x.noShow || x.end > now) continue;
    acc.set(x.sport, (acc.get(x.sport) ?? 0) + (x.end.getTime() - x.start.getTime()) / 3_600_000);
  }
  return [...acc].map(([sport, hours]) => ({ sport, hours })).sort((a, b) => b.hours - a.hours);
}

export const romeMonth = (d: Date) => romeDay(d).slice(0, 7);

export function bookingsByMonth(bookings: StatBooking[], months: string[]) {
  const counts = new Map(months.map((m) => [m, 0]));
  for (const x of bookings) {
    const m = romeMonth(x.start);
    if (x.status === "CONFIRMED" && counts.has(m)) counts.set(m, counts.get(m)! + 1);
  }
  return months.map((month) => ({ month, count: counts.get(month)! }));
}

export function lastMonths(today: string, n: number): string[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}
