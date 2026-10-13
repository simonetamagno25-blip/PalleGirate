import { DateTime } from 'luxon'

export const ROME = 'Europe/Rome'

/** Giorno di calendario a Roma, nel formato YYYY-MM-DD. */
export function romeDay(d: Date): string {
  return DateTime.fromJSDate(d, { zone: ROME }).toFormat('yyyy-MM-dd')
}

/** Minuti trascorsi dalla mezzanotte locale (Roma). */
export function romeMinutesOfDay(d: Date): number {
  const t = DateTime.fromJSDate(d, { zone: ROME })
  return t.hour * 60 + t.minute
}

/** Istante (Date, UTC) corrispondente a un giorno e un'ora locali di Roma. */
export function fromRome(day: string, hhmm: string): Date {
  const t = DateTime.fromISO(`${day}T${hhmm}`, { zone: ROME })
  if (!t.isValid) throw new Error(`Data/ora non valida: ${day} ${hhmm}`)
  return t.toJSDate()
}

/** Giorno YYYY-MM-DD spostato di n giorni di calendario. */
export function addDays(day: string, n: number): string {
  return DateTime.fromISO(day, { zone: ROME }).plus({ days: n }).toFormat('yyyy-MM-dd')
}

/** Giorni di calendario tra due giorni YYYY-MM-DD (to - from). */
export function daysBetween(fromDay: string, toDay: string): number {
  const a = DateTime.fromISO(fromDay, { zone: ROME }).startOf('day')
  const b = DateTime.fromISO(toDay, { zone: ROME }).startOf('day')
  return Math.round(b.diff(a, 'days').days)
}
