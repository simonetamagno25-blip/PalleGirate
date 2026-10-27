import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// Si simulano solo next-auth e gli header della richiesta; la logica di attivazione e il limite sono veri.
const signInMock = vi.hoisted(() => vi.fn())
vi.mock('next-auth', () => {
  class AuthError extends Error {}
  // Come in Auth.js: CredentialsSignin è un AuthError con un `code`.
  class CredentialsSignin extends AuthError {
    code = 'credentials'
  }
  return {
    default: () => ({ handlers: {}, auth: vi.fn(), signIn: signInMock, signOut: vi.fn() }),
    AuthError,
    CredentialsSignin,
  }
})
vi.mock('next-auth/providers/credentials', () => ({ default: () => ({}) }))
const ip = vi.hoisted(() => ({ value: '1.1.1.1' }))
vi.mock('next/headers', () => ({
  // Il proxy fidato aggiunge a destra l'IP del client; quello a sinistra lo scrive il client (qui: falso).
  headers: async () => new Headers({ 'x-forwarded-for': `9.9.9.9, ${ip.value}` }),
}))

import { AuthError, CredentialsSignin } from 'next-auth'
import { activateAction, loginAction } from '@backend/actions/auth'
import { prisma } from '@backend/lib/db'
import { resetRateLimits } from '@backend/lib/rate-limit'
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

afterEach(() => vi.unstubAllEnvs())

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

  test('con un proxy fidato, dallo stesso IP e tessere diverse: dopo 5 tentativi → tooMany', async () => {
    vi.stubEnv('TRUSTED_PROXY_HOPS', '1')
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

describe('senza proxy fidati dichiarati', () => {
  test('il limite per IP è disattivato: l\'header scritto dal client non lo fa scattare né lo aggira', async () => {
    for (let i = 0; i < 8; i++) {
      const r = await activateAction({}, form({ membershipNumber: `Y${i}`, email: 'x@example.com', password: 'password123' }))
      expect(r).toEqual({ error: 'ACTIVATION_FAILED' })
    }
  })
})

describe('loginAction', () => {
  test('troppi tentativi (codice too_many da authorize) → tooMany; altro errore di Auth.js → loginError', async () => {
    const tooMany = new CredentialsSignin()
    tooMany.code = 'too_many'
    signInMock.mockRejectedValueOnce(tooMany)
    expect(await loginAction({}, form({ email: 'a@example.com', password: 'x' }))).toEqual({ error: 'tooMany' })
    signInMock.mockRejectedValueOnce(new CredentialsSignin()) // codice 'credentials': password sbagliata
    expect(await loginAction({}, form({ email: 'a@example.com', password: 'x' }))).toEqual({ error: 'loginError' })
    signInMock.mockRejectedValueOnce(new AuthError('Configuration'))
    expect(await loginAction({}, form({ email: 'a@example.com', password: 'x' }))).toEqual({ error: 'loginError' })
  })
})
