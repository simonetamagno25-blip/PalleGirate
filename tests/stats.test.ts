import { beforeEach, describe, expect, test } from 'vitest'
import { prisma } from '@/lib/db'
import { getMemberDashboard } from '@/lib/stats-member'
import { fromRome } from '@/lib/time'
import { makeBooking, makeField, makeMember, NOW, resetDb } from './helpers'

beforeEach(resetDb)

describe('getMemberDashboard', () => {
  test('prenotazioni attive: solo CONFIRMED future; upcoming ordinate per inizio, al massimo 5', async () => {
    const m = await makeMember()
    const f = await makeField()
    for (const d of ['2026-10-25', '2026-10-15', '2026-10-17', '2026-10-19', '2026-10-21', '2026-10-23']) {
      await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome(d, '10:00') })
    }
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-16', '10:00'), status: 'CANCELLED' })
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-10', '10:00') })
    const d = await getMemberDashboard(m.id, NOW)
    expect(d.activeCount).toBe(6)
    expect(d.maxActive).toBe(3)
    expect(d.upcoming).toHaveLength(5)
    expect(d.upcoming.map((b) => b.start.toISOString())).toEqual(
      ['2026-10-15', '2026-10-17', '2026-10-19', '2026-10-21', '2026-10-23'].map((x) => fromRome(x, '10:00').toISOString()),
    )
    expect(d.upcoming[0].field.id).toBe(f.id)
  })

  test('ore giocate per sport: concluse, confermate, senza no-show; 90 min = 1,5 h', async () => {
    const m = await makeMember()
    const tennis = await makeField({ name: 'T' })
    const calcio = await prisma.field.create({ data: { name: 'C', sport: 'calcio', slotMinutes: 90, pricePerSlot: 6000 } })
    await makeBooking({ userId: m.id, fieldId: tennis.id, start: fromRome('2026-10-05', '10:00'), slots: 2 })
    await makeBooking({ userId: m.id, fieldId: calcio.id, start: fromRome('2026-10-06', '10:00') })
    const noShow = await makeBooking({ userId: m.id, fieldId: tennis.id, start: fromRome('2026-10-07', '10:00') })
    await prisma.booking.update({ where: { id: noShow.id }, data: { noShow: true } })
    await makeBooking({ userId: m.id, fieldId: tennis.id, start: fromRome('2026-10-08', '10:00'), status: 'CANCELLED' })
    await makeBooking({ userId: m.id, fieldId: tennis.id, start: fromRome('2026-10-20', '10:00') })
    const d = await getMemberDashboard(m.id, NOW)
    expect(d.hoursBySport).toEqual([
      { sport: 'tennis', hours: 2 },
      { sport: 'calcio', hours: 1.5 },
    ])
  })

  test('bookingsByMonth: sempre 12 mesi in ordine, mesi vuoti a 0, mese corrente per ultimo, anche a cavallo d\'anno', async () => {
    const m = await makeMember()
    const f = await makeField()
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-05', '10:00') })
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-20', '10:00') })
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-01-31', '23:00') })
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2025-11-10', '10:00') })
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2025-10-31', '10:00') }) // fuori dai 12 mesi
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-06', '10:00'), status: 'CANCELLED' })
    const { bookingsByMonth } = await getMemberDashboard(m.id, NOW)
    expect(bookingsByMonth).toHaveLength(12)
    expect(bookingsByMonth[0]).toEqual({ month: '2025-11', count: 1 })
    expect(bookingsByMonth[11]).toEqual({ month: '2026-10', count: 2 })
    expect(bookingsByMonth.find((x) => x.month === '2026-01')).toEqual({ month: '2026-01', count: 1 })
    expect(bookingsByMonth.find((x) => x.month === '2026-05')).toEqual({ month: '2026-05', count: 0 })
    expect(bookingsByMonth.map((x) => x.month)).toEqual([...bookingsByMonth.map((x) => x.month)].sort())
  })

  test('debito, strike e blocco coerenti con i pagamenti', async () => {
    const m = await makeMember()
    const f = await makeField({ pricePerSlot: 1800 })
    const b1 = await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-05', '10:00'), paymentStatus: 'UNPAID' })
    const b2 = await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-06', '10:00'), paymentStatus: 'UNPAID' })
    await prisma.strike.createMany({ data: [{ userId: m.id, bookingId: b1.id }, { userId: m.id, bookingId: b2.id }] })
    expect(await getMemberDashboard(m.id, NOW)).toMatchObject({ debtCents: 3600, strikes: 2, blocked: true })
    await prisma.booking.update({ where: { id: b1.id }, data: { paymentStatus: 'PAID' } })
    await prisma.booking.update({ where: { id: b2.id }, data: { paymentStatus: 'PAID' } })
    expect(await getMemberDashboard(m.id, NOW)).toMatchObject({ debtCents: 0, strikes: 2, blocked: false })
  })

  test('tessera: numero, scadenza e giorni; null se non c\'è', async () => {
    const m = await makeMember({ expiresAt: fromRome('2026-10-28', '12:00') })
    const { membership } = await getMemberDashboard(m.id, NOW)
    expect(membership).toMatchObject({ daysLeft: 15 })
    expect(membership!.number).toMatch(/^T\d+/)
    expect(membership!.expiresAt).toEqual(fromRome('2026-10-28', '12:00'))
    const admin = await makeMember({ isAdmin: true, expiresAt: null })
    expect((await getMemberDashboard(admin.id, NOW)).membership).toBeNull()
  })

  test('non include dati di altri soci', async () => {
    const [a, b] = [await makeMember(), await makeMember()]
    const f = await makeField()
    await makeBooking({ userId: b.id, fieldId: f.id, start: fromRome('2026-10-20', '10:00'), paymentStatus: 'UNPAID' })
    await makeBooking({ userId: b.id, fieldId: f.id, start: fromRome('2026-10-05', '10:00') })
    const d = await getMemberDashboard(a.id, NOW)
    expect(d).toMatchObject({ activeCount: 0, debtCents: 0, strikes: 0 })
    expect(d.upcoming).toHaveLength(0)
    expect(d.hoursBySport).toEqual([])
  })
})
