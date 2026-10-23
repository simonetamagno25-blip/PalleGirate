import { beforeEach, describe, expect, test } from 'vitest'
import { prisma } from '@/lib/db'
import { BookingError } from '@/lib/booking-service'
import { getAdminDashboard } from '@/lib/stats-admin'
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

describe('getAdminDashboard', () => {
  const asAdmin = (u: { id: string }) => ({ id: u.id, isAdmin: true })
  let admin: Awaited<ReturnType<typeof makeMember>>

  beforeEach(async () => {
    admin = await makeMember({ isAdmin: true, expiresAt: null })
  })

  test('un socio non può leggere la dashboard admin', async () => {
    const m = await makeMember()
    await expect(getAdminDashboard({ id: m.id, isAdmin: false }, 'week', NOW)).rejects.toBeInstanceOf(BookingError)
  })

  test('occupazione: quarti occupati / quarti aperti nel periodo; i campi disattivati non compaiono', async () => {
    const m = await makeMember()
    const f = await makeField({ name: 'Uno' })
    await makeField({ name: 'Spento', active: false })
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-13', '10:00') })
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-13', '15:00') })
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-13', '18:00'), status: 'CANCELLED' })
    const day = await getAdminDashboard(asAdmin(admin), 'day', NOW)
    expect(day.occupancy).toEqual([{ fieldId: f.id, name: 'Uno', occupiedQuarters: 8, openQuarters: 60, ratio: 8 / 60 }])
    const week = await getAdminDashboard(asAdmin(admin), 'week', NOW)
    expect(week.occupancy[0]).toMatchObject({ occupiedQuarters: 8, openQuarters: 420 })
    const month = await getAdminDashboard(asAdmin(admin), 'month', NOW)
    expect(month.occupancy[0]).toMatchObject({ occupiedQuarters: 8, openQuarters: 31 * 60 })
  })

  test('la settimana va da lunedì a domenica; una prenotazione di domenica sera conta nella settimana giusta', async () => {
    const m = await makeMember()
    const f = await makeField()
    // NOW = martedì 13/10/2026: settimana 12–18/10.
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-18', '22:00') })
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-19', '09:00') })
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-11', '09:00') })
    const week = await getAdminDashboard(asAdmin(admin), 'week', NOW)
    expect(week.occupancy[0].occupiedQuarters).toBe(4)
  })

  test('incassi: atteso = dovuto concluso nel periodo senza EXEMPT; incassato = PAID; insoluto = tutti gli UNPAID', async () => {
    const m = await makeMember()
    const f = await makeField({ pricePerSlot: 1800 })
    const at = (d: string, over = {}) => makeBooking({ userId: m.id, fieldId: f.id, start: fromRome(d, '10:00'), ...over })
    await at('2026-10-05', { paymentStatus: 'PAID' })
    await at('2026-10-06', { paymentStatus: 'EXEMPT' })
    await at('2026-10-07')
    await at('2026-10-08', { status: 'CANCELLED', chargeable: true })
    await at('2026-10-09', { status: 'CANCELLED' })
    await at('2026-09-20', { paymentStatus: 'UNPAID' })
    await at('2026-10-20')
    const d = await getAdminDashboard(asAdmin(admin), 'month', NOW)
    expect(d.revenue).toEqual({ expectedCents: 5400, collectedCents: 1800, unpaidCents: 1800 })
    const day = await getAdminDashboard(asAdmin(admin), 'day', NOW)
    // L'insoluto non dipende dal periodo.
    expect(day.revenue).toEqual({ expectedCents: 0, collectedCents: 0, unpaidCents: 1800 })
  })

  test('no-show del periodo e soci bloccati (almeno 2 strike e almeno un insoluto)', async () => {
    const [a, b, c] = [await makeMember(), await makeMember(), await makeMember()]
    // Un campo a testa: gli stessi orari su un solo campo violerebbero il vincolo anti-sovrapposizione.
    const fieldOf = new Map([a, b, c].map((u) => [u.id, makeField()]))
    const mk = async (userId: string, d: string, over = {}) =>
      makeBooking({ userId, fieldId: (await fieldOf.get(userId)!).id, start: fromRome(d, '10:00'), ...over })
    const a1 = await mk(a.id, '2026-10-01', { paymentStatus: 'UNPAID' })
    const a2 = await mk(a.id, '2026-10-02', { paymentStatus: 'UNPAID' })
    const b1 = await mk(b.id, '2026-10-01', { paymentStatus: 'PAID' })
    const b2 = await mk(b.id, '2026-10-02', { paymentStatus: 'PAID' })
    const c1 = await mk(c.id, '2026-10-03', { paymentStatus: 'UNPAID' })
    await prisma.strike.createMany({
      data: [a1, a2, b1, b2, c1].map((x) => ({ userId: x.userId, bookingId: x.id })),
    })
    const ns = await mk(c.id, '2026-10-04')
    await prisma.booking.update({ where: { id: ns.id }, data: { noShow: true } })
    const old = await mk(c.id, '2026-09-04')
    await prisma.booking.update({ where: { id: old.id }, data: { noShow: true } })
    const d = await getAdminDashboard(asAdmin(admin), 'month', NOW)
    expect(d.blockedMembers).toBe(1)
    expect(d.noShows).toBe(1)
  })

  test('fasce più richieste: ultimi 90 giorni, per giorno della settimana (0 = lunedì) e ora di Roma', async () => {
    const m = await makeMember()
    const f = await makeField()
    const mk = (d: string, t: string, over = {}) => makeBooking({ userId: m.id, fieldId: f.id, start: fromRome(d, t), ...over })
    await mk('2026-10-25', '22:00') // domenica, giorno del cambio d'ora
    await mk('2026-10-18', '22:00') // un'altra domenica alle 22
    await mk('2026-10-26', '08:00') // lunedì
    await mk('2026-07-01', '10:00') // oltre 90 giorni prima
    await mk('2026-10-27', '10:00', { status: 'CANCELLED' })
    const later = fromRome('2026-11-02', '12:00')
    const { popularSlots } = await getAdminDashboard(asAdmin(admin), 'week', later)
    expect(popularSlots).toContainEqual({ weekday: 6, hour: 22, count: 2 })
    expect(popularSlots).toContainEqual({ weekday: 0, hour: 8, count: 1 })
    expect(popularSlots).toHaveLength(2)
  })

  test('andamento: 12 mesi con i mesi vuoti a 0', async () => {
    const m = await makeMember()
    const f = await makeField()
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-05', '10:00') })
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-03-05', '10:00') })
    const { trend } = await getAdminDashboard(asAdmin(admin), 'month', NOW)
    expect(trend).toHaveLength(12)
    expect(trend[11]).toEqual({ month: '2026-10', count: 1 })
    expect(trend.find((t) => t.month === '2026-03')).toEqual({ month: '2026-03', count: 1 })
    expect(trend.find((t) => t.month === '2026-07')).toEqual({ month: '2026-07', count: 0 })
  })

  test('tessere in scadenza: entro i giorni di avviso, per scadenza crescente; non quelle scadute o lontane', async () => {
    const soon = await makeMember({ expiresAt: fromRome('2026-10-20', '12:00') })
    const sooner = await makeMember({ expiresAt: fromRome('2026-10-14', '12:00') })
    await makeMember({ expiresAt: fromRome('2026-10-12', '12:00') })
    await makeMember({ expiresAt: fromRome('2026-12-01', '12:00') })
    const { expiringMemberships } = await getAdminDashboard(asAdmin(admin), 'week', NOW)
    expect(expiringMemberships.map((x) => x.userId)).toEqual([sooner.id, soon.id])
    expect(expiringMemberships[0]).toMatchObject({ number: expect.stringMatching(/^T/), expiresAt: fromRome('2026-10-14', '12:00') })
    expect(expiringMemberships[0].name).toContain(sooner.lastName)
  })
})
