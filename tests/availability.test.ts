import { beforeEach, describe, expect, test } from 'vitest'
import { prisma } from '@/lib/db'
import { getDayAvailability } from '@/lib/availability'
import { cancelBooking, createBooking } from '@/lib/booking-service'
import { fromRome } from '@/lib/time'
import { makeField, makeMember, NOW, resetDb } from './helpers'

beforeEach(resetDb)

const DAY = '2026-10-20'

async function memberNamed(firstName: string, lastName: string, email: string) {
  const m = await makeMember({ email })
  return prisma.user.update({ where: { id: m.id }, data: { firstName, lastName } })
}

// Le prenotazioni di prova le crea un admin: qui non si testano i limiti del socio.
const book = (userId: string, fieldId: string, day: string, from: string, slots = 1) =>
  createBooking({ id: 'admin', isAdmin: true }, { memberId: userId, fieldId, start: fromRome(day, from), slots }, NOW)

describe('getDayAvailability', () => {
  test('vista pubblica: intervalli occupati corretti e nessun dato personale, nemmeno serializzato', async () => {
    const anna = await memberNamed('Anna', 'Zanzibar', 'anna.zanzibar@example.com')
    const bruno = await memberNamed('Bruno', 'Quirinale', 'bruno.quirinale@example.com')
    const f = await makeField({ name: 'Tennis 1' })
    await book(anna.id, f.id, DAY, '10:00', 2)
    await book(bruno.id, f.id, DAY, '15:15')

    const result = await getDayAvailability(DAY, { admin: false })
    expect(result.fields.map((x) => x.name)).toEqual(['Tennis 1'])
    expect(result.busy).toEqual([
      { fieldId: f.id, start: fromRome(DAY, '10:00').toISOString(), end: fromRome(DAY, '12:00').toISOString() },
      { fieldId: f.id, start: fromRome(DAY, '15:15').toISOString(), end: fromRome(DAY, '16:15').toISOString() },
    ])

    const json = JSON.stringify(result).toLowerCase()
    for (const secret of ['anna', 'zanzibar', 'bruno', 'quirinale', 'example.com', anna.id.toLowerCase(), bruno.id.toLowerCase()]) {
      expect(json, secret).not.toContain(secret)
    }
  })

  test('vista admin: include id prenotazione e nome del socio', async () => {
    const anna = await memberNamed('Anna', 'Zanzibar', 'anna.zanzibar@example.com')
    const f = await makeField()
    const b = await book(anna.id, f.id, DAY, '10:00')
    const result = await getDayAvailability(DAY, { admin: true })
    expect(result.busy).toEqual([
      expect.objectContaining({ fieldId: f.id, bookingId: b.id, memberName: 'Anna Zanzibar' }),
    ])
  })

  test('esclude prenotazioni cancellate, di altri giorni e campi non attivi', async () => {
    const m = await makeMember()
    const f = await makeField()
    const inactive = await makeField({ active: true })
    const keep = await book(m.id, f.id, DAY, '10:00')
    const toCancel = await book(m.id, f.id, DAY, '12:00')
    await book(m.id, f.id, '2026-10-21', '10:00')
    await book(m.id, inactive.id, DAY, '10:00')
    await cancelBooking({ id: m.id, isAdmin: false }, toCancel.id, undefined, NOW)
    await prisma.field.update({ where: { id: inactive.id }, data: { active: false } })

    const result = await getDayAvailability(DAY, { admin: true })
    expect(result.fields.map((x) => x.id)).toEqual([f.id])
    expect(result.busy.map((b) => b.bookingId)).toEqual([keep.id])
  })

  test('una prenotazione fino alle 23:00 appartiene a quel giorno e non al successivo', async () => {
    const m = await makeMember()
    const f = await makeField()
    await book(m.id, f.id, DAY, '22:00')
    expect((await getDayAvailability(DAY, { admin: false })).busy).toHaveLength(1)
    expect((await getDayAvailability('2026-10-21', { admin: false })).busy).toHaveLength(0)
  })

  test('giorno non valido → INVALID_DAY', async () => {
    await expect(getDayAvailability('20-10-2026', { admin: false })).rejects.toThrow('INVALID_DAY')
  })
})
