import type { RuleSettings } from "@/lib/booking-rules";
import { overlaps, type BusyInterval } from "./grid";

export type FreeStart = { minute: number; maxSlots: number };

/** Orari di inizio liberi di un campo in un giorno. È solo un aiuto per l'interfaccia: il server riverifica tutto. */
export function freeStarts(p: { slotMinutes: number; settings: RuleSettings; busy: BusyInterval[]; notBeforeMinute?: number }): FreeStart[] {
  const { slotMinutes, settings: s, busy } = p;
  const out: FreeStart[] = [];
  for (let m = s.openMinutes; m < s.closeMinutes; m += s.startStepMinutes) {
    if (p.notBeforeMinute !== undefined && m <= p.notBeforeMinute) continue;
    let maxSlots = 0;
    for (let n = 1; n <= s.maxSlotsPerBooking; n++) {
      const interval = { startMin: m, endMin: m + n * slotMinutes };
      if (interval.endMin > s.closeMinutes || busy.some((b) => overlaps(b, interval))) break;
      maxSlots = n;
    }
    if (maxSlots > 0) out.push({ minute: m, maxSlots });
  }
  return out;
}

/**
 * Limite "nel passato" per gli orari di inizio proposti.
 * Un socio non vede giorni passati né orari già trascorsi oggi; un admin può scegliere qualsiasi orario
 * (il server salta IN_PAST per lui). Orari di apertura, passo e occupazione restano sempre rispettati.
 */
export function pastLimit(p: { admin: boolean; day: string; today: string; nowMinute: number }): { allowed: boolean; notBeforeMinute?: number } {
  if (p.admin) return { allowed: true };
  if (p.day < p.today) return { allowed: false };
  return { allowed: true, notBeforeMinute: p.day === p.today ? p.nowMinute : undefined };
}
