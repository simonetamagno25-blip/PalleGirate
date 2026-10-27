import { beforeEach, describe, expect, test } from 'vitest'
import { prisma } from '@backend/lib/db'
import { createBooking, cancelBooking } from '@backend/lib/booking-service'
import { listAllBookings, listMemberBookings } from '@backend/lib/booking-queries'
import { fromRome } from '@backend/lib/time'
import { makeField, makeMember, NOW, resetDb } from './helpers'

beforeEach(resetDb)

const ADMIN = { id: 'admin', isAdmin: true }

const book = (memberId: string, fieldId: string, day: string, from: string, slots = 1) =>
  createBooking(ADMIN, { memberId, fieldId, start: fromRome(day, from), slots }, NOW)

describe('listMemberBookings', () => {
  test('prossime: solo future e confermate, in ordine cronologico; storico: passate e cancellate, dalla più recente', async () => {
    const m = await makeMember()
    const f = await makeField()
    const later = await book(m.id, f.id, '2026-10-20', '10:00')
    const sooner = await book(m.id, f.id, '2026-10-15', '10:00')
    const past = await book(m.id, f.id, '2026-10-01', '10:00')
    const cancelled = await book(m.id, f.id, '2026-10-22', '10:00')
    await cancelBooking(ADMIN, cancelled.id, undefined, NOW)

    const { upcoming, history } = await listMemberBookings(m.id, NOW)
    expect(upcoming.map((b) => b.id)).toEqual([sooner.id, later.id])
    expect(history.map((b) => b.id)).toEqual([cancelled.id, past.id])
    expect(upcoming[0].field.name).toBe(f.name)
  })

  test('non include le prenotazioni di altri soci', async () => {
    const [a, b] = [await makeMember(), await makeMember()]
    const f = await makeField()
    await book(a.id, f.id, '2026-10-20', '10:00')
    const mine = await book(b.id, f.id, '2026-10-20', '12:00')
    expect((await listMemberBookings(b.id, NOW)).upcoming.map((x) => x.id)).toEqual([mine.id])
  })
})

describe('listAllBookings', () => {
  test('filtra per campo, giorno e socio', async () => {
    const anna = await prisma.user.update({
      where: { id: (await makeMember({ email: 'anna@example.com' })).id },
      data: { firstName: 'Anna', lastName: 'Zanzibar' },
    })
    const bruno = await makeMember()
    const tennis = await makeField({ name: 'Tennis X' })
    const basket = await makeField({ name: 'Basket X' })
    const a1 = await book(anna.id, tennis.id, '2026-10-20', '10:00')
    const a2 = await book(anna.id, basket.id, '2026-10-21', '10:00')
    const b1 = await book(bruno.id, tennis.id, '2026-10-21', '12:00')

    const ids = async (f: Parameters<typeof listAllBookings>[1]) => (await listAllBookings(ADMIN, f)).map((b) => b.id).sort()
    expect(await ids({})).toEqual([a1.id, a2.id, b1.id].sort())
    expect(await ids({ fieldId: tennis.id })).toEqual([a1.id, b1.id].sort())
    expect(await ids({ day: '2026-10-21' })).toEqual([a2.id, b1.id].sort())
    expect(await ids({ q: 'zanzi' })).toEqual([a1.id, a2.id].sort())
    expect(await ids({ q: 'anna@', fieldId: basket.id, day: '2026-10-21' })).toEqual([a2.id])
  })

  test('include socio e campo, più recenti prima, comprese le cancellate', async () => {
    const m = await makeMember()
    const f = await makeField()
    const first = await book(m.id, f.id, '2026-10-20', '10:00')
    const second = await book(m.id, f.id, '2026-10-21', '10:00')
    await cancelBooking(ADMIN, second.id, 'motivo', NOW)
    const rows = await listAllBookings(ADMIN, {})
    expect(rows.map((b) => b.id)).toEqual([second.id, first.id])
    expect(rows[0]).toMatchObject({ status: 'CANCELLED', cancelReason: 'motivo' })
    expect(rows[0].user.email).toBe(m.email)
  })

  test('un non-admin riceve FORBIDDEN', async () => {
    await expect(listAllBookings({ id: 'x', isAdmin: false }, {})).rejects.toThrow('FORBIDDEN')
  })
})
