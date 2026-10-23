import { beforeEach, describe, expect, test } from 'vitest'
import { prisma } from '@/lib/db'
import {
  activateAccount,
  createMember,
  listMembers,
  renewMembership,
  resetAccess,
  setAdmin,
  updateMember,
} from '@/lib/members'
import { fromRome } from '@/lib/time'
import { makeMember, NOW, resetDb } from './helpers'

beforeEach(resetDb)

const newMember = (over: Partial<Parameters<typeof createMember>[1]> = {}) => ({
  firstName: 'Mario',
  lastName: 'Rossi',
  birthDate: new Date('1990-05-15'),
  email: 'Mario.Rossi@Example.com',
  phone: '3331234567',
  membershipNumber: 'T0100',
  issuedAt: fromRome('2026-10-13', '12:00'),
  ...over,
})

async function admin() {
  // Come l'admin del seed: nessuna tessera.
  const a = await makeMember({ isAdmin: true, expiresAt: null })
  return { id: a.id, isAdmin: true }
}
async function plain() {
  const m = await makeMember()
  return { id: m.id, isAdmin: false }
}

describe('createMember', () => {
  test('scadenza di default = emissione + 1 anno; email normalizzata', async () => {
    const u = await createMember(await admin(), newMember())
    const membership = await prisma.membership.findUniqueOrThrow({ where: { userId: u.id } })
    expect(membership.expiresAt).toEqual(fromRome('2027-10-13', '12:00'))
    expect(membership.number).toBe('T0100')
    expect(u.email).toBe('mario.rossi@example.com')
    expect(u.passwordHash).toBeNull()
  })

  test('scadenza esplicita rispettata', async () => {
    const u = await createMember(await admin(), newMember({ expiresAt: fromRome('2027-01-31', '12:00') }))
    const m = await prisma.membership.findUniqueOrThrow({ where: { userId: u.id } })
    expect(m.expiresAt).toEqual(fromRome('2027-01-31', '12:00'))
  })

  test('numero tessera ed email duplicati sono rifiutati (email senza distinzione di maiuscole)', async () => {
    const a = await admin()
    await createMember(a, newMember())
    await expect(createMember(a, newMember({ email: 'altra@example.com' }))).rejects.toThrow('DUPLICATE_MEMBERSHIP_NUMBER')
    await expect(createMember(a, newMember({ membershipNumber: 'T0101', email: ' MARIO.rossi@example.com' }))).rejects.toThrow(
      'DUPLICATE_EMAIL',
    )
    expect(await prisma.membership.count()).toBe(1)
  })
})

describe('updateMember', () => {
  test('modifica anagrafica e scadenza', async () => {
    const a = await admin()
    const u = await createMember(a, newMember())
    await updateMember(a, u.id, { lastName: 'Bianchi', phone: '3399999999', expiresAt: fromRome('2028-01-01', '12:00') })
    const after = await prisma.user.findUniqueOrThrow({ where: { id: u.id }, include: { membership: true } })
    expect(after.lastName).toBe('Bianchi')
    expect(after.phone).toBe('3399999999')
    expect(after.membership!.expiresAt).toEqual(fromRome('2028-01-01', '12:00'))
  })

  test('email di un altro socio → DUPLICATE_EMAIL; la propria email invariata è ok', async () => {
    const a = await admin()
    const one = await createMember(a, newMember())
    await createMember(a, newMember({ membershipNumber: 'T0101', email: 'altra@example.com' }))
    await expect(updateMember(a, one.id, { email: 'ALTRA@example.com' })).rejects.toThrow('DUPLICATE_EMAIL')
    await expect(updateMember(a, one.id, { email: 'mario.rossi@example.com' })).resolves.toBeDefined()
  })
})

describe('renewMembership', () => {
  test('rinnovo anticipato: nuova scadenza = vecchia scadenza + 1 anno, emissione = oggi, stesso numero', async () => {
    const a = await admin()
    const u = await createMember(a, newMember({ issuedAt: fromRome('2025-12-01', '12:00'), expiresAt: fromRome('2026-12-01', '12:00') }))
    const m = await renewMembership(a, u.id, undefined, NOW)
    expect(m.number).toBe('T0100')
    expect(m.issuedAt).toEqual(NOW)
    expect(m.expiresAt).toEqual(fromRome('2027-12-01', '12:00'))
    expect(await prisma.membershipRenewal.count({ where: { membershipId: m.id } })).toBe(1)
  })

  test('tessera già scaduta: nuova scadenza = oggi + 1 anno', async () => {
    const a = await admin()
    const u = await createMember(a, newMember({ issuedAt: fromRome('2025-01-01', '12:00'), expiresAt: fromRome('2026-01-01', '12:00') }))
    const m = await renewMembership(a, u.id, undefined, NOW)
    expect(m.expiresAt).toEqual(fromRome('2027-10-13', '12:00'))
  })

  test('l\'admin può correggere la scadenza proposta', async () => {
    const a = await admin()
    const u = await createMember(a, newMember())
    const m = await renewMembership(a, u.id, { expiresAt: fromRome('2027-03-01', '12:00') }, NOW)
    expect(m.expiresAt).toEqual(fromRome('2027-03-01', '12:00'))
  })

  test('utente senza tessera → NOT_FOUND', async () => {
    const a = await admin()
    await expect(renewMembership(a, a.id, undefined, NOW)).rejects.toThrow('NOT_FOUND')
  })
})

describe('resetAccess e setAdmin', () => {
  test('resetAccess riporta l\'account "da attivare" e l\'attivazione funziona di nuovo', async () => {
    const a = await admin()
    const u = await createMember(a, newMember())
    await activateAccount({ membershipNumber: 'T0100', email: 'mario.rossi@example.com', password: 'password123' })
    await resetAccess(a, u.id)
    const after = await prisma.user.findUniqueOrThrow({ where: { id: u.id } })
    expect(after.passwordHash).toBeNull()
    expect(after.activatedAt).toBeNull()
    await expect(
      activateAccount({ membershipNumber: 'T0100', email: 'mario.rossi@example.com', password: 'nuovapassword1' }),
    ).resolves.toBeUndefined()
  })

  test('resetAccess rifiuta utenti senza tessera (non potrebbero riattivarsi) e il reset di sé stessi', async () => {
    const a = await admin() // come l'admin del seed: nessuna tessera
    const m = await createMember(a, newMember())
    await expect(resetAccess(a, a.id)).rejects.toThrow('SELF_RESET')
    const noCard = await makeMember({ expiresAt: null })
    await prisma.user.update({ where: { id: noCard.id }, data: { passwordHash: 'x', activatedAt: new Date() } })
    await expect(resetAccess(a, noCard.id)).rejects.toThrow('NO_MEMBERSHIP')
    expect((await prisma.user.findUniqueOrThrow({ where: { id: noCard.id } })).passwordHash).toBe('x')
    // un altro admin con tessera può invece essere reimpostato da un collega
    await expect(resetAccess(a, m.id)).resolves.toBeUndefined()
  })

  test('si può promuovere a admin e togliere i diritti, ma non all\'ultimo admin', async () => {
    const a = await admin()
    const m = await plain()
    await setAdmin(a, m.id, true)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: m.id } })).isAdmin).toBe(true)
    await setAdmin(a, m.id, false)
    await expect(setAdmin(a, a.id, false)).rejects.toThrow('LAST_ADMIN')
    expect((await prisma.user.findUniqueOrThrow({ where: { id: a.id } })).isAdmin).toBe(true)
  })
})

describe('listMembers', () => {
  test('cerca per nome, cognome, email o numero tessera', async () => {
    const a = await admin()
    await createMember(a, newMember())
    await createMember(a, newMember({ firstName: 'Giulia', lastName: 'Bianchi', email: 'giulia@example.com', membershipNumber: 'T0200' }))
    expect((await listMembers(a, 'bianchi')).map((u) => u.firstName)).toEqual(['Giulia'])
    expect((await listMembers(a, 'T0100')).map((u) => u.firstName)).toEqual(['Mario'])
    expect((await listMembers(a, 'giulia@')).map((u) => u.firstName)).toEqual(['Giulia'])
    expect((await listMembers(a, 'zzz'))).toEqual([])
  })
})

describe('autorizzazione', () => {
  test('un non-admin riceve FORBIDDEN da ogni funzione', async () => {
    const a = await admin()
    const u = await createMember(a, newMember())
    const m = await plain()
    await expect(createMember(m, newMember({ membershipNumber: 'T9', email: 'x@example.com' }))).rejects.toThrow('FORBIDDEN')
    await expect(updateMember(m, u.id, { lastName: 'X' })).rejects.toThrow('FORBIDDEN')
    await expect(renewMembership(m, u.id)).rejects.toThrow('FORBIDDEN')
    await expect(resetAccess(m, u.id)).rejects.toThrow('FORBIDDEN')
    await expect(setAdmin(m, u.id, true)).rejects.toThrow('FORBIDDEN')
    await expect(listMembers(m)).rejects.toThrow('FORBIDDEN')
  })
})
