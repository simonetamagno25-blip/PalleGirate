import { beforeEach, describe, expect, test } from 'vitest'
import { prisma } from '@/lib/db'
import { setUserLocale } from '@/lib/members'
import { makeMember, resetDb } from './helpers'

beforeEach(resetDb)

describe('setUserLocale', () => {
  test('salva la lingua scelta sul profilo', async () => {
    const m = await makeMember()
    await setUserLocale(m.id, 'en')
    expect((await prisma.user.findUniqueOrThrow({ where: { id: m.id } })).locale).toBe('en')
    await setUserLocale(m.id, 'it')
    expect((await prisma.user.findUniqueOrThrow({ where: { id: m.id } })).locale).toBe('it')
  })

  test('una lingua non supportata è rifiutata e il profilo non cambia', async () => {
    const m = await makeMember()
    await expect(setUserLocale(m.id, 'fr')).rejects.toThrow('INVALID_LOCALE')
    expect((await prisma.user.findUniqueOrThrow({ where: { id: m.id } })).locale).toBe('it')
  })
})
