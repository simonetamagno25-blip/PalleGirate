import { describe, expect, test } from 'vitest'
import { addDays, daysBetween, fromRome, hhmm, romeDay, romeMinutesOfDay } from '@backend/lib/time'

describe('time (Europe/Rome)', () => {
  test('romeDay usa il giorno di calendario locale, non UTC', () => {
    // 22:30 UTC del 24/10 = 00:30 del 25/10 a Roma (ora legale ancora attiva)
    expect(romeDay(new Date('2026-10-24T22:30:00Z'))).toBe('2026-10-25')
  })

  test('fromRome converte tenendo conto del cambio ora legale', () => {
    expect(fromRome('2026-10-24', '08:00').toISOString()).toBe('2026-10-24T06:00:00.000Z')
    expect(fromRome('2026-10-25', '08:00').toISOString()).toBe('2026-10-25T07:00:00.000Z')
  })

  test('romeMinutesOfDay restituisce i minuti dalla mezzanotte locale', () => {
    expect(romeMinutesOfDay(fromRome('2026-10-25', '08:15'))).toBe(8 * 60 + 15)
    expect(romeMinutesOfDay(fromRome('2026-07-01', '23:00'))).toBe(23 * 60)
  })

  test('hhmm formatta i minuti dalla mezzanotte come HH:MM', () => {
    expect(hhmm(8 * 60)).toBe('08:00')
    expect(hhmm(22 * 60 + 45)).toBe('22:45')
    expect(hhmm(0)).toBe('00:00')
  })

  test('addDays somma giorni di calendario, anche a cavallo di mese e anno', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-10-13', -13)).toBe('2026-09-30')
  })

  test('daysBetween conta i giorni di calendario', () => {
    expect(daysBetween('2026-10-13', '2026-10-27')).toBe(14)
    expect(daysBetween('2026-10-20', '2026-11-03')).toBe(14)
  })
})
