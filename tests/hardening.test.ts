import bcrypt from 'bcryptjs'
import { beforeEach, describe, expect, test, vi } from 'vitest'

// Si simula solo il livello next-auth: requireMember/requireAdmin restano quelli veri.
const authMock = vi.hoisted(() => vi.fn())
vi.mock('next-auth', () => ({
  default: () => ({ handlers: {}, auth: authMock, signIn: vi.fn(), signOut: vi.fn() }),
}))
vi.mock('next-auth/providers/credentials', () => ({ default: () => ({}) }))

import {
  adminCancelBookingAction,
  adminUpdateBookingAction,
  cancelBookingAction,
  updateBookingAction,
} from '@/app/[locale]/(app)/actions'
import { BookingError, cancelBooking, createBooking } from '@/lib/booking-service'
import { prisma } from '@/lib/db'
import { activateAccount, resetAccess, verifyCredentials } from '@/lib/members'
import { isSessionCurrent } from '@/lib/session-version'
import { fromRome, isValidDay } from '@/lib/time'
import { makeField, makeMember, NOW, resetDb } from './helpers'

beforeEach(async () => {
  await resetDb()
  authMock.mockReset()
})

describe('isValidDay', () => {
  test.each([
    ['2026-02-30', false],
    ['2026-13-01', false],
    ['2026-1-5', false],
    ['domani', false],
    ['', false],
    ['2027-02-29', false],
    ['2028-02-29', true],
    ['2026-10-25', true],
  ])('%s → %s', (s, expected) => {
    expect(isValidDay(s)).toBe(expected)
  })
})

describe('isSessionCurrent', () => {
  test.each([
    [0, 1, false],
    [1, 1, true],
    [undefined, 0, false],
    ['1', 1, false],
    [null, 0, false],
  ])('token %s, utente %s → %s', (token, user, expected) => {
    expect(isSessionCurrent(token, user)).toBe(expected)
  })
})

describe('sessionVersion', () => {
  test('resetAccess + riattivazione fanno salire la versione: i vecchi token non valgono più', async () => {
    const admin = await makeMember({ isAdmin: true, expiresAt: null })
    const m = await makeMember({ email: 'mario@example.com' })
    const number = (await prisma.membership.findUniqueOrThrow({ where: { userId: m.id } })).number
    await prisma.user.update({
      where: { id: m.id },
      data: { passwordHash: await bcrypt.hash('password123', 4), activatedAt: new Date() },
    })
    const before = await verifyCredentials('mario@example.com', 'password123')
    expect(before).toMatchObject({ id: m.id, sessionVersion: 0 })

    await resetAccess({ id: admin.id, isAdmin: true }, m.id)
    await activateAccount({ membershipNumber: number, email: 'mario@example.com', password: 'password456' })

    const after = await verifyCredentials('mario@example.com', 'password456')
    expect(after?.sessionVersion).toBe(1)
    expect(isSessionCurrent(before!.sessionVersion, after!.sessionVersion)).toBe(false)
  })
})

describe('cancellazione concorrente', () => {
  test('due cancellazioni simultanee: una riesce, l\'altra ALREADY_CANCELLED, nessuna occupazione orfana', async () => {
    const m = await makeMember()
    const f = await makeField()
    const b = await createBooking({ id: m.id, isAdmin: false }, { memberId: m.id, fieldId: f.id, start: fromRome('2026-10-20', '10:00'), slots: 1 }, NOW)
    const results = await Promise.allSettled([
      cancelBooking({ id: m.id, isAdmin: false }, b.id, undefined, NOW),
      cancelBooking({ id: m.id, isAdmin: false }, b.id, undefined, NOW),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult
    expect(rejected.reason).toBeInstanceOf(BookingError)
    expect((rejected.reason as BookingError).violations).toEqual(['ALREADY_CANCELLED'])
    expect(await prisma.occupancy.count()).toBe(0)
    expect(await prisma.notification.count({ where: { type: 'BOOKING_CANCELLED' } })).toBe(1)
  })
})

describe('azioni: id e motivo limitati', () => {
  async function loginAsMember(isAdmin = false) {
    const m = await makeMember({ isAdmin, expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000) })
    await prisma.user.update({ where: { id: m.id }, data: { activatedAt: new Date() } })
    authMock.mockResolvedValue({ user: { id: m.id, sessionVersion: 0 } })
    return m
  }
  const INVALID = { ok: false, violations: ['INVALID_INPUT'] }

  test('id lunghissimo o motivo oltre 500 caratteri → INVALID_INPUT', async () => {
    await loginAsMember()
    const longId = 'x'.repeat(10_000)
    expect(await cancelBookingAction(longId)).toMatchObject(INVALID)
    expect(await cancelBookingAction('abc', 'r'.repeat(501))).toMatchObject(INVALID)
    expect(await updateBookingAction(longId, { fieldId: 'f', day: '2026-10-20', time: '10:00', slots: 1 })).toMatchObject(INVALID)
  })

  test('anche le azioni admin: id e motivo limitati; un id breve inesistente resta NOT_FOUND', async () => {
    await loginAsMember(true)
    const longId = 'x'.repeat(10_000)
    expect(await adminCancelBookingAction(longId, '')).toMatchObject(INVALID)
    expect(await adminCancelBookingAction('abc', 'r'.repeat(501))).toMatchObject(INVALID)
    expect(await adminUpdateBookingAction(longId, { fieldId: 'f', day: '2026-10-20', time: '10:00', slots: 1 })).toMatchObject(INVALID)
    expect(await adminCancelBookingAction('abc', '')).toMatchObject({ ok: false, violations: ['NOT_FOUND'] })
  })

  test('un motivo di 500 caratteri è accettato', async () => {
    await loginAsMember()
    expect(await cancelBookingAction('abc', 'r'.repeat(500))).toMatchObject({ ok: false, violations: ['NOT_FOUND'] })
  })
})
