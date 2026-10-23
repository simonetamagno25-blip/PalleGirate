import { beforeEach, describe, expect, test, vi } from 'vitest'

// Si simulano solo next-auth e gli header della richiesta; la logica di attivazione e il limite sono veri.
const signInMock = vi.hoisted(() => vi.fn())
vi.mock('next-auth', () => ({
  default: () => ({ handlers: {}, auth: vi.fn(), signIn: signInMock, signOut: vi.fn() }),
  AuthError: class AuthError extends Error {},
}))
vi.mock('next-auth/providers/credentials', () => ({ default: () => ({}) }))
const ip = vi.hoisted(() => ({ value: '1.1.1.1' }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': `${ip.value}, 10.0.0.1` }),
}))

import { AuthError } from 'next-auth'
import { activateAction, loginAction } from '@/app/[locale]/(auth)/actions'
import { prisma } from '@/lib/db'
import { resetRateLimits } from '@/lib/rate-limit'
import { makeMember, resetDb } from './helpers'

const form = (o: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(o)) f.set(k, v)
  return f
}

beforeEach(async () => {
  await resetDb()
  resetRateLimits()
  signInMock.mockReset()
  ip.value = '1.1.1.1'
})

describe('attivazione con limite di tentativi', () => {
  test('dopo 5 tentativi falliti sullo stesso numero tessera, anche quello giusto è rifiutato con tooMany', async () => {
    const m = await makeMember({ email: 'mario@example.com' })
    const number = (await prisma.membership.findUniqueOrThrow({ where: { userId: m.id } })).number
    for (let i = 0; i < 5; i++) {
      ip.value = `2.2.2.${i}` // IP diversi: scatta la chiave per numero tessera
      const r = await activateAction({}, form({ membershipNumber: number, email: 'sbagliata@example.com', password: 'password123' }))
      expect(r).toEqual({ error: 'ACTIVATION_FAILED' })
    }
    ip.value = '9.9.9.9'
    const blocked = await activateAction({}, form({ membershipNumber: number, email: 'mario@example.com', password: 'password123' }))
    expect(blocked).toEqual({ error: 'tooMany' })
    expect((await prisma.user.findUniqueOrThrow({ where: { id: m.id } })).passwordHash).toBeNull()
  })

  test('la stessa tessera con maiuscole/spazi diversi conta come la stessa chiave', async () => {
    for (let i = 0; i < 5; i++) {
      ip.value = `3.3.3.${i}`
      await activateAction({}, form({ membershipNumber: i % 2 ? ' t0001 ' : 'T0001', email: 'x@example.com', password: 'password123' }))
    }
    ip.value = '4.4.4.4'
    expect(await activateAction({}, form({ membershipNumber: 'T0001', email: 'x@example.com', password: 'password123' }))).toEqual({
      error: 'tooMany',
    })
  })

  test('dallo stesso IP, tessere diverse: dopo 5 tentativi → tooMany', async () => {
    for (let i = 0; i < 5; i++) {
      await activateAction({}, form({ membershipNumber: `Z${i}`, email: 'x@example.com', password: 'password123' }))
    }
    expect(await activateAction({}, form({ membershipNumber: 'Z9', email: 'x@example.com', password: 'password123' }))).toEqual({
      error: 'tooMany',
    })
  })

  test('un attivazione corretta entro il limite riesce', async () => {
    const m = await makeMember({ email: 'mario@example.com' })
    const number = (await prisma.membership.findUniqueOrThrow({ where: { userId: m.id } })).number
    expect(await activateAction({}, form({ membershipNumber: number, email: 'mario@example.com', password: 'password123' }))).toEqual({ ok: true })
  })
})

describe('login con limite di tentativi', () => {
  test('dopo 10 tentativi falliti sulla stessa email → tooMany senza chiamare signIn', async () => {
    signInMock.mockRejectedValue(new AuthError('CredentialsSignin'))
    for (let i = 0; i < 10; i++) {
      ip.value = `5.5.5.${i}`
      expect(await loginAction({}, form({ email: 'Mario@Example.com ', password: 'x' }))).toEqual({ error: 'loginError' })
    }
    signInMock.mockClear()
    ip.value = '6.6.6.6'
    expect(await loginAction({}, form({ email: 'mario@example.com', password: 'x' }))).toEqual({ error: 'tooMany' })
    expect(signInMock).not.toHaveBeenCalled()
  })
})
