import { describe, expect, test } from 'vitest'
import {
  canChangeOrCancel,
  checkAdminRules,
  checkMemberRules,
  DEFAULT_SETTINGS,
  isBlocked,
  quarterStarts,
  ruleParams,
  type RuleContext,
} from '@/lib/booking-rules'
import { fromRome } from '@/lib/time'

const NOW = fromRome('2026-10-13', '12:00')

/** Prenotazione tennis (slot da 60 min) valida per un socio, con override. */
function ctx(over: {
  day?: string
  from?: string
  to?: string
  slotMinutes?: number
  now?: Date
  membershipExpiresAt?: Date | null
  activeCount?: number
  blocked?: boolean
} = {}): RuleContext {
  const day = over.day ?? '2026-10-14'
  return {
    start: fromRome(day, over.from ?? '10:00'),
    end: fromRome(day, over.to ?? '11:00'),
    fieldSlotMinutes: over.slotMinutes ?? 60,
    now: over.now ?? NOW,
    settings: DEFAULT_SETTINGS,
    membershipExpiresAt:
      over.membershipExpiresAt === undefined ? fromRome('2027-06-30', '12:00') : over.membershipExpiresAt,
    activeCount: over.activeCount ?? 0,
    blocked: over.blocked ?? false,
  }
}

describe('orari e durata', () => {
  test('08:00-09:00 è valido', () => {
    expect(checkMemberRules(ctx({ from: '08:00', to: '09:00' }))).toEqual([])
  })
  test('inizio non multiplo di 15 minuti', () => {
    expect(checkMemberRules(ctx({ from: '08:10', to: '09:10' }))).toContain('NOT_ON_STEP')
  })
  test('inizio prima dell\'apertura', () => {
    expect(checkMemberRules(ctx({ from: '07:45', to: '08:45' }))).toContain('BEFORE_OPENING')
  })
  test('22:00-23:00 è valido, 22:15-23:15 supera la chiusura', () => {
    expect(checkMemberRules(ctx({ from: '22:00', to: '23:00' }))).toEqual([])
    expect(checkMemberRules(ctx({ from: '22:15', to: '23:15' }))).toContain('AFTER_CLOSING')
  })
  test('calcio: 90 e 180 minuti validi, 120 no', () => {
    expect(checkMemberRules(ctx({ slotMinutes: 90, from: '10:00', to: '11:30' }))).toEqual([])
    expect(checkMemberRules(ctx({ slotMinutes: 90, from: '10:00', to: '13:00' }))).toEqual([])
    expect(checkMemberRules(ctx({ slotMinutes: 90, from: '10:00', to: '12:00' }))).toContain('BAD_DURATION')
  })
  test('tennis: 120 minuti valido, 180 no', () => {
    expect(checkMemberRules(ctx({ from: '10:00', to: '12:00' }))).toEqual([])
    expect(checkMemberRules(ctx({ from: '10:00', to: '13:00' }))).toContain('BAD_DURATION')
  })
  test('una prenotazione che finisce dopo la mezzanotte supera la chiusura', () => {
    const c = ctx({ from: '22:00', to: '23:00' })
    c.end = fromRome('2026-10-15', '00:00')
    expect(checkMemberRules(c)).toContain('AFTER_CLOSING')
  })
  test('il giorno del cambio ora legale ha orari e durata corretti', () => {
    expect(checkMemberRules(ctx({ day: '2026-10-25', from: '08:00', to: '09:00', now: fromRome('2026-10-20', '12:00') }))).toEqual([])
    expect(checkMemberRules(ctx({ day: '2027-03-28', from: '22:00', to: '23:00', now: fromRome('2027-03-20', '12:00') }))).toEqual([])
  })
})

describe('tempo', () => {
  test('inizio nel passato', () => {
    expect(checkMemberRules(ctx({ from: '09:00', to: '10:00', day: '2026-10-13' }))).toContain('IN_PAST')
  })
  test('anticipo: oggi+14 ok anche a fine giornata, oggi+15 no', () => {
    expect(checkMemberRules(ctx({ day: '2026-10-27', from: '22:00', to: '23:00' }))).toEqual([])
    expect(checkMemberRules(ctx({ day: '2026-10-28' }))).toContain('TOO_FAR_AHEAD')
  })
  test('anticipo: con now a 23:59 il limite resta oggi+14', () => {
    const now = fromRome('2026-10-13', '23:59')
    expect(checkMemberRules(ctx({ day: '2026-10-27', now }))).toEqual([])
    expect(checkMemberRules(ctx({ day: '2026-10-28', now }))).toContain('TOO_FAR_AHEAD')
  })
  test('anticipo attraverso il cambio ora legale', () => {
    const now = fromRome('2026-10-20', '12:00')
    expect(checkMemberRules(ctx({ day: '2026-11-03', now }))).toEqual([])
    expect(checkMemberRules(ctx({ day: '2026-11-04', now }))).toContain('TOO_FAR_AHEAD')
  })
})

describe('tessera, limite attive, blocco', () => {
  const expires = fromRome('2026-12-31', '12:00')
  test('l\'ultimo giorno di validità è prenotabile, il giorno dopo no', () => {
    const now = fromRome('2026-12-20', '12:00')
    expect(checkMemberRules(ctx({ day: '2026-12-31', from: '22:00', to: '23:00', now, membershipExpiresAt: expires }))).toEqual([])
    expect(checkMemberRules(ctx({ day: '2027-01-01', now, membershipExpiresAt: expires }))).toContain('MEMBERSHIP_EXPIRED')
  })
  test('senza tessera non si prenota', () => {
    expect(checkMemberRules(ctx({ membershipExpiresAt: null }))).toContain('MEMBERSHIP_EXPIRED')
  })
  test('max 3 prenotazioni attive', () => {
    expect(checkMemberRules(ctx({ activeCount: 2 }))).toEqual([])
    expect(checkMemberRules(ctx({ activeCount: 3 }))).toContain('MAX_ACTIVE_REACHED')
  })
  test('socio bloccato', () => {
    expect(checkMemberRules(ctx({ blocked: true }))).toContain('BLOCKED')
  })
  test('restituisce tutte le violazioni insieme', () => {
    const v = checkMemberRules(ctx({ from: '08:10', to: '09:10', blocked: true, activeCount: 3 }))
    expect(v).toEqual(['NOT_ON_STEP', 'MAX_ACTIVE_REACHED', 'BLOCKED'])
  })
})

describe('admin', () => {
  test('ignora anticipo, tessera, limite e blocco', () => {
    const c = ctx({ day: '2027-05-01', membershipExpiresAt: null, activeCount: 9, blocked: true })
    expect(checkAdminRules(c)).toEqual([])
  })
  test('segnala comunque chiusura e durata', () => {
    expect(checkAdminRules(ctx({ from: '22:15', to: '23:15' }))).toContain('AFTER_CLOSING')
    expect(checkAdminRules(ctx({ from: '10:00', to: '10:45' }))).toContain('BAD_DURATION')
  })
})

describe('finestra di modifica/cancellazione', () => {
  const start = fromRome('2026-10-14', '10:00')
  test('esattamente 2 ore prima è ancora consentito', () => {
    expect(canChangeOrCancel(start, fromRome('2026-10-14', '08:00'), DEFAULT_SETTINGS)).toBe(true)
  })
  test('a 1h59m59s dall\'inizio non è più consentito', () => {
    const now = new Date(fromRome('2026-10-14', '08:00').getTime() + 1000)
    expect(canChangeOrCancel(start, now, DEFAULT_SETTINGS)).toBe(false)
  })
})

describe('isBlocked', () => {
  test.each([
    [0, 0, false],
    [1, 1, false],
    [2, 1, true],
    [2, 0, false],
    [3, 2, true],
  ])('strikes=%i insoluti=%i → %s', (strikes, unpaidCount, expected) => {
    expect(isBlocked({ strikes, unpaidCount })).toBe(expected)
  })
})

describe('quarterStarts', () => {
  test('08:00-09:30 → 6 quarti d\'ora', () => {
    const q = quarterStarts(fromRome('2026-10-14', '08:00'), fromRome('2026-10-14', '09:30'))
    expect(q).toHaveLength(6)
    expect(q[0]).toEqual(fromRome('2026-10-14', '08:00'))
    expect(q[5]).toEqual(fromRome('2026-10-14', '09:15'))
  })
})

describe('ruleParams', () => {
  test('espone gli orari come HH:MM e i limiti per i messaggi', () => {
    expect(ruleParams(DEFAULT_SETTINGS)).toEqual({ open: '08:00', close: '23:00', days: 14, hours: 2, maxActive: 3, step: 15 })
    expect(ruleParams({ ...DEFAULT_SETTINGS, openMinutes: 9 * 60 + 30, closeMinutes: 22 * 60, maxActiveBookings: 5 })).toMatchObject({
      open: '09:30',
      close: '22:00',
      maxActive: 5,
    })
  })
})
