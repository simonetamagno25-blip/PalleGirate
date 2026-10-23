import bcrypt from 'bcryptjs'
import { beforeEach, describe, expect, test } from 'vitest'
import { prisma } from '@/lib/db'
import { authorizeCredentials, TooManyAttemptsError } from '@/lib/login'
import { resetRateLimits } from '@/lib/rate-limit'
import { makeMember, resetDb } from './helpers'

// `authorizeCredentials` è ciò che Auth.js esegue per ogni login con credenziali: la pagina di login
// e un POST diretto a /api/auth/callback/credentials passano entrambi da qui, quindi il limite vale per entrambi.

beforeEach(async () => {
  await resetDb()
  resetRateLimits()
})

async function activeMember(email = 'mario@example.com', password = 'password123') {
  const m = await makeMember({ email })
  return prisma.user.update({
    where: { id: m.id },
    data: { passwordHash: await bcrypt.hash(password, 4), activatedAt: new Date() },
  })
}

describe('authorizeCredentials', () => {
  test('credenziali corrette → identità; sbagliate o malformate → null', async () => {
    const u = await activeMember()
    expect(await authorizeCredentials({ email: 'mario@example.com', password: 'password123' }, null)).toMatchObject({ id: u.id })
    expect(await authorizeCredentials({ email: 'mario@example.com', password: 'sbagliata' }, null)).toBeNull()
    expect(await authorizeCredentials({ email: 5, password: {} }, null)).toBeNull()
    expect(await authorizeCredentials(undefined, null)).toBeNull()
  })

  test('dopo 10 tentativi sulla stessa email (maiuscole e spazi inclusi) anche la password giusta è bloccata', async () => {
    await activeMember()
    for (let i = 0; i < 10; i++) {
      expect(await authorizeCredentials({ email: i % 2 ? ' MARIO@example.com ' : 'mario@example.com', password: 'x' }, null)).toBeNull()
    }
    await expect(authorizeCredentials({ email: 'mario@example.com', password: 'password123' }, null)).rejects.toBeInstanceOf(
      TooManyAttemptsError,
    )
  })

  test('con un IP noto: dopo 30 tentativi su email diverse lo stesso IP è bloccato', async () => {
    for (let i = 0; i < 30; i++) await authorizeCredentials({ email: `utente${i}@example.com`, password: 'x' }, '7.7.7.7')
    await expect(authorizeCredentials({ email: 'altro@example.com', password: 'x' }, '7.7.7.7')).rejects.toBeInstanceOf(TooManyAttemptsError)
    expect(await authorizeCredentials({ email: 'altro@example.com', password: 'x' }, '8.8.8.8')).toBeNull()
  })

  test('senza IP affidabile (null) il limite per IP non scatta mai, solo quello per email', async () => {
    for (let i = 0; i < 40; i++) {
      expect(await authorizeCredentials({ email: `utente${i}@example.com`, password: 'x' }, null)).toBeNull()
    }
  })
})
