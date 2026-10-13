// Regole di prenotazione (spec §7). Modulo puro: nessuna dipendenza da Next o Prisma.
import { daysBetween, romeDay, romeMinutesOfDay } from '@/lib/time'

export type Settings = {
  openMinutes: number
  closeMinutes: number
  stepMinutes: number
  maxAdvanceDays: number
  maxActiveBookings: number
  changeWindowHours: number
  maxSlotsPerBooking: number
  membershipWarnDays: number
}

/** Ordine dell'unione = ordine in cui `checkMemberRules` restituisce le violazioni. */
export type Violation =
  | 'NOT_ON_STEP'
  | 'BEFORE_OPENING'
  | 'AFTER_CLOSING'
  | 'BAD_DURATION'
  | 'IN_PAST'
  | 'TOO_FAR_AHEAD'
  | 'MEMBERSHIP_EXPIRED'
  | 'MAX_ACTIVE_REACHED'
  | 'BLOCKED'
  | 'OVERLAP'

export type RuleContext = {
  start: Date
  end: Date
  fieldSlotMinutes: number
  now: Date
  settings: Settings
  membershipExpiresAt: Date | null
  activeCount: number
  blocked: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  openMinutes: 8 * 60,
  closeMinutes: 23 * 60,
  stepMinutes: 15,
  maxAdvanceDays: 14,
  maxActiveBookings: 3,
  changeWindowHours: 2,
  maxSlotsPerBooking: 2,
  membershipWarnDays: 15,
}

const MINUTE = 60_000

/** Regola 1: passo di 15 minuti, apertura e chiusura. */
export function checkOpeningHours(c: Pick<RuleContext, 'start' | 'end' | 'settings'>): Violation[] {
  const { start, end, settings: s } = c
  const out: Violation[] = []
  const startMin = romeMinutesOfDay(start)
  if (startMin % s.stepMinutes !== 0) out.push('NOT_ON_STEP')
  if (startMin < s.openMinutes) out.push('BEFORE_OPENING')
  const endsNextDay = romeDay(end) !== romeDay(start)
  if (endsNextDay || romeMinutesOfDay(end) > s.closeMinutes) out.push('AFTER_CLOSING')
  return out
}

/** Regola 2: durata = da 1 a `maxSlotsPerBooking` slot del campo. */
function checkDuration(c: Pick<RuleContext, 'start' | 'end' | 'fieldSlotMinutes' | 'settings'>): Violation[] {
  const minutes = (c.end.getTime() - c.start.getTime()) / MINUTE
  const slots = minutes / c.fieldSlotMinutes
  const valid = Number.isInteger(slots) && slots >= 1 && slots <= c.settings.maxSlotsPerBooking
  return valid ? [] : ['BAD_DURATION']
}

/** Regole che valgono anche per l'admin: orari di apertura e durata valida. */
export function checkAdminRules(
  c: Pick<RuleContext, 'start' | 'end' | 'settings' | 'fieldSlotMinutes'>,
): Violation[] {
  return [...checkOpeningHours(c), ...checkDuration(c)]
}

/** Regole 1–7 per il socio. La 8 (sovrapposizione) la garantisce il database. */
export function checkMemberRules(c: RuleContext): Violation[] {
  const out: Violation[] = [...checkAdminRules(c)]
  if (c.start.getTime() < c.now.getTime()) out.push('IN_PAST')

  const bookingDay = romeDay(c.start)
  if (daysBetween(romeDay(c.now), bookingDay) > c.settings.maxAdvanceDays) out.push('TOO_FAR_AHEAD')
  if (c.membershipExpiresAt === null || bookingDay > romeDay(c.membershipExpiresAt)) {
    out.push('MEMBERSHIP_EXPIRED')
  }
  if (c.activeCount >= c.settings.maxActiveBookings) out.push('MAX_ACTIVE_REACHED')
  if (c.blocked) out.push('BLOCKED')
  return out
}

/** Modifica/cancellazione del socio: ammesse fino a `changeWindowHours` prima dell'inizio originale. */
export function canChangeOrCancel(originalStart: Date, now: Date, s: Settings): boolean {
  return now.getTime() <= originalStart.getTime() - s.changeWindowHours * 60 * MINUTE
}

/** Bloccato = almeno 2 strike e almeno un insoluto ancora aperto (spec §6). */
export function isBlocked(x: { strikes: number; unpaidCount: number }): boolean {
  return x.strikes >= 2 && x.unpaidCount >= 1
}

const QUARTER = 15 * MINUTE

/** Un Date per ogni quarto d'ora dell'intervallo [start, end). */
export function quarterStarts(start: Date, end: Date): Date[] {
  const out: Date[] = []
  for (let t = start.getTime(); t < end.getTime(); t += QUARTER) out.push(new Date(t))
  return out
}
