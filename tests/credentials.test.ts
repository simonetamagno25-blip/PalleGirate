import bcrypt from 'bcryptjs'
import { beforeEach, describe, expect, test } from 'vitest'
import { prisma } from '@/lib/db'
import { verifyCredentials } from '@/lib/members'
import { makeMember, resetDb } from './helpers'

beforeEach(resetDb)

async function activeMember(email: string, password: string, isAdmin = false) {
  const m = await makeMember({ email, isAdmin })
  return prisma.user.update({
    where: { id: m.id },
    data: { passwordHash: await bcrypt.hash(password, 4), activatedAt: new Date() },
  })
}

describe('verifyCredentials', () => {
  test('credenziali corrette → utente con id e ruolo', async () => {
    const u = await activeMember('mario@example.com', 'password123')
    expect(await verifyCredentials('mario@example.com', 'password123')).toMatchObject({ id: u.id, isAdmin: false })
  })

  test('l\'email è confrontata senza maiuscole né spazi', async () => {
    const u = await activeMember('mario@example.com', 'password123', true)
    expect(await verifyCredentials('  MARIO@example.com ', 'password123')).toMatchObject({ id: u.id, isAdmin: true })
  })

  test('password sbagliata, email sconosciuta e account non attivato → null', async () => {
    await activeMember('mario@example.com', 'password123')
    await makeMember({ email: 'nonattivo@example.com' })
    expect(await verifyCredentials('mario@example.com', 'sbagliata')).toBeNull()
    expect(await verifyCredentials('nessuno@example.com', 'password123')).toBeNull()
    expect(await verifyCredentials('nonattivo@example.com', 'password123')).toBeNull()
  })
})
