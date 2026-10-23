import { minutesToHHMM, romeMinutesOfDay } from "@/lib/time/rome";
import type { RuleField, RuleSettings, SlotRequest, Violation } from "./types";

const QUARTER_MS = 15 * 60_000;

export function bookingEnd(start: Date, slots: number, field: RuleField): Date {
  return new Date(start.getTime() + slots * field.slotMinutes * 60_000);
}

export function bookingPrice(priceCentsPerSlot: number, slots: number): number {
  return priceCentsPerSlot * slots;
}

export function quarterStarts(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  for (let t = start.getTime(); t < end.getTime(); t += QUARTER_MS) out.push(new Date(t));
  return out;
}

/**
 * Regole che valgono per tutti, admin compreso: campo attivo, numero di slot,
 * passo degli orari, apertura e chiusura.
 */
export function checkSchedule(req: SlotRequest, field: RuleField, s: RuleSettings): Violation[] {
  const v: Violation[] = [];
  if (!field.active) v.push({ code: "FIELD_INACTIVE" });

  const slotsOk = Number.isInteger(req.slots) && req.slots >= 1 && req.slots <= s.maxSlotsPerBooking;
  if (!slotsOk) v.push({ code: "INVALID_SLOTS", params: { max: s.maxSlotsPerBooking } });

  const startMin = romeMinutesOfDay(req.start);
  const onGrid = req.start.getUTCSeconds() === 0 && req.start.getUTCMilliseconds() === 0 && startMin % s.startStepMinutes === 0;
  if (!onGrid) v.push({ code: "START_NOT_ON_STEP", params: { step: s.startStepMinutes } });

  if (startMin < s.openMinutes) {
    v.push({ code: "BEFORE_OPENING", params: { time: minutesToHHMM(s.openMinutes) } });
  } else if (slotsOk) {
    // Il cambio d'ora avviene tra le 02:00 e le 03:00, fuori dall'orario di apertura,
    // quindi l'ora di fine "a orologio" è inizio + durata.
    const endMin = startMin + req.slots * field.slotMinutes;
    if (endMin > s.closeMinutes) v.push({ code: "AFTER_CLOSING", params: { time: minutesToHHMM(s.closeMinutes) } });
  }
  return v;
}
