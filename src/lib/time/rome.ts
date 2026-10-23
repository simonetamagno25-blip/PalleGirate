import { TZDate } from "@date-fns/tz";

export const TIME_ZONE = "Europe/Rome";

// en-CA formatta come YYYY-MM-DD; en-GB con h23 come HH:MM.
const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export function romeDay(instant: Date): string {
  return dayFormatter.format(instant);
}

export function romeMinutesOfDay(instant: Date): number {
  const [h, m] = timeFormatter.format(instant).split(":").map(Number);
  return h * 60 + m;
}

export function romeInstant(day: string, minutesOfDay: number): Date {
  const [y, mo, d] = day.split("-").map(Number);
  const local = new TZDate(y, mo - 1, d, Math.floor(minutesOfDay / 60), minutesOfDay % 60, TIME_ZONE);
  return new Date(local.getTime());
}

function dayToUtcMs(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(day: string, n: number): string {
  return new Date(dayToUtcMs(day) + n * 86_400_000).toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  return Math.round((dayToUtcMs(to) - dayToUtcMs(from)) / 86_400_000);
}

export function minutesToHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
