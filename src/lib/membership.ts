import { diffDays } from "@/lib/time/rome";

export function addYears(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const lastOfMonth = new Date(Date.UTC(y + n, m, 0)).getUTCDate();
  return `${y + n}-${String(m).padStart(2, "0")}-${String(Math.min(d, lastOfMonth)).padStart(2, "0")}`;
}

export const defaultExpiry = (issueDate: string) => addYears(issueDate, 1);

/** Rinnovo: emissione = oggi, scadenza = max(oggi, scadenza attuale) + 1 anno. */
export function proposeRenewal(today: string, currentExpiry: string) {
  const base = currentExpiry > today ? currentExpiry : today;
  return { issueDate: today, expiryDate: addYears(base, 1) };
}

export const daysUntilExpiry = (expiry: string, today: string) => diffDays(today, expiry);
