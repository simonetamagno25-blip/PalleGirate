import bcrypt from 'bcryptjs'
import { beforeEach, describe, expect, test } from 'vitest'
import { prisma } from '@backend/lib/db'
import { activateAccount } from '@backend/lib/members'
import { makeMember, resetDb } from './helpers'

beforeEach(resetDb)

async function memberWithNumber(email = 'mario.rossi@example.com') {
  const m = await makeMember({ email })
  const membership = await prisma.membership.findUniqueOrThrow({ where: { userId: m.id } })
  return { user: m, number: membership.number }
}

describe('activateAccount', () => {
  test('imposta passwordHash e activatedAt', async () => {
    const { user, number } = await memberWithNumber()
    await activateAccount({ membershipNumber: number, email: 'mario.rossi@example.com', password: 'password123' })
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(after.passwordHash).not.toBeNull()
    expect(after.activatedAt).not.toBeNull()
  })

  test('salva un hash bcrypt, non la password in chiaro', async () => {
    const { user, number } = await memberWithNumber()
    await activateAccount({ membershipNumber: number, email: 'mario.rossi@example.com', password: 'password123' })
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(after.passwordHash).not.toBe('password123')
    expect(await bcrypt.compare('password123', after.passwordHash!)).toBe(true)
  })

  test('email con maiuscole e spazi diversi funziona', async () => {
    const { number } = await memberWithNumber()
    await expect(
      activateAccount({ membershipNumber: ` ${number} `, email: '  MARIO.Rossi@Example.com ', password: 'password123' }),
    ).resolves.toBeUndefined()
  })

  test('tessera inesistente, email sbagliata e account già attivo danno lo stesso errore', async () => {
    const { number } = await memberWithNumber()
    const errors: string[] = []
    const attempt = async (membershipNumber: string, email: string) => {
      try {
        await activateAccount({ membershipNumber, email, password: 'password123' })
        errors.push('NESSUN ERRORE')
      } catch (e) {
        errors.push((e as Error).message)
      }
    }
    await attempt('NON-ESISTE', 'mario.rossi@example.com')
    await attempt(number, 'altra@example.com')
    await activateAccount({ membershipNumber: number, email: 'mario.rossi@example.com', password: 'password123' })
    await attempt(number, 'mario.rossi@example.com')
    expect(errors).toEqual(['ACTIVATION_FAILED', 'ACTIVATION_FAILED', 'ACTIVATION_FAILED'])
  })

  test('password di 7 caratteri → WEAK_PASSWORD e l\'account resta da attivare', async () => {
    const { user, number } = await memberWithNumber()
    await expect(
      activateAccount({ membershipNumber: number, email: 'mario.rossi@example.com', password: '1234567' }),
    ).rejects.toThrow('WEAK_PASSWORD')
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).toBeNull()
  })
})
