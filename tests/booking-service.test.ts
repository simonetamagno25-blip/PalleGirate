import { beforeEach, describe, expect, test } from 'vitest'
import { prisma } from '@/lib/db'
import { BookingError, cancelBooking, createBooking, updateBooking, type Actor } from '@/lib/booking-service'
import { fromRome } from '@/lib/time'
import { makeField, makeMember, NOW, resetDb } from './helpers'

const DAY = '2026-10-20'

const asActor = (u: { id: string; isAdmin: boolean }): Actor => ({ id: u.id, isAdmin: u.isAdmin })

function violationsOf(p: Promise<unknown>) {
  return p.then(
    () => {
      throw new Error('atteso BookingError, ma è riuscito')
    },
    (e) => {
      expect(e).toBeInstanceOf(BookingError)
      return (e as BookingError).violations
    },
  )
}

async function book(
  member: { id: string; isAdmin: boolean },
  fieldId: string,
  from: string,
  slots = 1,
  day = DAY,
  now = NOW,
) {
  return createBooking(asActor(member), { memberId: member.id, fieldId, start: fromRome(day, from), slots }, now)
}

const occupancyCount = (fieldId?: string) => prisma.occupancy.count({ where: fieldId ? { fieldId } : {} })

beforeEach(resetDb)

describe('createBooking', () => {
  test('scrive prenotazione, prezzo e 4 righe di occupazione per 1 ora', async () => {
    const m = await makeMember()
    const f = await makeField({ pricePerSlot: 1800 })
    const b = await book(m, f.id, '10:00')
    expect(b.status).toBe('CONFIRMED')
    expect(b.priceCents).toBe(1800)
    expect(b.end).toEqual(fromRome(DAY, '11:00'))
    expect(await occupancyCount(f.id)).toBe(4)
  })

  test('2 slot di tennis costano il doppio e occupano 8 quarti', async () => {
    const m = await makeMember()
    const f = await makeField({ pricePerSlot: 1800 })
    const b = await book(m, f.id, '10:00', 2)
    expect(b.priceCents).toBe(3600)
    expect(await occupancyCount(f.id)).toBe(8)
  })

  test('una sovrapposizione anche di soli 15 minuti è rifiutata, anche da un altro socio', async () => {
    const [a, b] = [await makeMember(), await makeMember()]
    const f = await makeField()
    await book(a, f.id, '10:00')
    expect(await violationsOf(book(b, f.id, '10:45'))).toEqual(['OVERLAP'])
    expect(await occupancyCount(f.id)).toBe(4)
    expect(await prisma.booking.count()).toBe(1)
  })

  test('prenotazioni adiacenti sono consentite', async () => {
    const [a, b] = [await makeMember(), await makeMember()]
    const f = await makeField()
    await book(a, f.id, '10:00')
    await book(b, f.id, '11:00')
    expect(await prisma.booking.count()).toBe(2)
  })

  test('richieste concorrenti sullo stesso slot: ne riesce esattamente una', async () => {
    const [a, b] = [await makeMember(), await makeMember()]
    const f = await makeField()
    const results = await Promise.allSettled([book(a, f.id, '10:00'), book(b, f.id, '10:00')])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult
    expect(rejected.reason).toBeInstanceOf(BookingError)
    expect((rejected.reason as BookingError).violations).toEqual(['OVERLAP'])
    expect(await occupancyCount(f.id)).toBe(4)
    expect(await prisma.booking.count()).toBe(1)
  })

  test('la 4ª prenotazione attiva è rifiutata', async () => {
    const m = await makeMember()
    const f = await makeField()
    for (const from of ['08:00', '10:00', '12:00']) await book(m, f.id, from)
    expect(await violationsOf(book(m, f.id, '14:00'))).toEqual(['MAX_ACTIVE_REACHED'])
  })

  test('un socio bloccato non può prenotare', async () => {
    const m = await makeMember()
    const f = await makeField()
    const old = await prisma.booking.create({
      data: { userId: m.id, fieldId: f.id, start: fromRome('2026-10-01', '10:00'), end: fromRome('2026-10-01', '11:00'), slots: 1, priceCents: 1800, paymentStatus: 'UNPAID' },
    })
    await prisma.strike.createMany({ data: [{ userId: m.id, bookingId: old.id }, { userId: m.id, bookingId: old.id }] })
    expect(await violationsOf(book(m, f.id, '10:00'))).toEqual(['BLOCKED'])
  })

  test('l\'admin prenota per un socio bloccato, con tessera scaduta e oltre i 14 giorni', async () => {
    const admin = await makeMember({ isAdmin: true })
    const m = await makeMember({ expiresAt: fromRome('2026-10-14', '12:00') })
    const f = await makeField()
    const b = await createBooking(asActor(admin), { memberId: m.id, fieldId: f.id, start: fromRome('2027-03-02', '10:00'), slots: 1 }, NOW)
    expect(b.userId).toBe(m.id)
  })

  test('l\'admin non può prenotare a centro chiuso né sovrapporsi', async () => {
    const admin = await makeMember({ isAdmin: true })
    const m = await makeMember()
    const f = await makeField()
    expect(
      await violationsOf(createBooking(asActor(admin), { memberId: m.id, fieldId: f.id, start: fromRome(DAY, '22:15'), slots: 1 }, NOW)),
    ).toContain('AFTER_CLOSING')
    await book(m, f.id, '10:00')
    expect(
      await violationsOf(createBooking(asActor(admin), { memberId: m.id, fieldId: f.id, start: fromRome(DAY, '10:30'), slots: 1 }, NOW)),
    ).toEqual(['OVERLAP'])
  })

  test('un socio non può prenotare a nome di un altro', async () => {
    const [a, b] = [await makeMember(), await makeMember()]
    const f = await makeField()
    const p = createBooking(asActor(a), { memberId: b.id, fieldId: f.id, start: fromRome(DAY, '10:00'), slots: 1 }, NOW)
    expect(await violationsOf(p)).toEqual(['FORBIDDEN'])
  })

  test('campo non attivo o inesistente', async () => {
    const m = await makeMember()
    const f = await makeField({ active: false })
    expect(await violationsOf(book(m, f.id, '10:00'))).toEqual(['FIELD_INACTIVE'])
    expect(await violationsOf(book(m, 'inesistente', '10:00'))).toEqual(['NOT_FOUND'])
  })

  test('numero di slot non valido (0, 3, 1.5) → BAD_DURATION', async () => {
    const m = await makeMember()
    const f = await makeField()
    for (const slots of [0, 3, 1.5]) {
      expect(await violationsOf(book(m, f.id, '10:00', slots))).toContain('BAD_DURATION')
    }
    expect(await prisma.booking.count()).toBe(0)
  })
})

describe('updateBooking', () => {
  test('cambio campo: ricalcola il prezzo e sposta l\'occupazione', async () => {
    const m = await makeMember()
    const tennis = await makeField({ pricePerSlot: 1800 })
    const basket = await makeField({ pricePerSlot: 2500 })
    const b = await book(m, tennis.id, '10:00', 2)
    const u = await updateBooking(asActor(m), b.id, { fieldId: basket.id, start: fromRome(DAY, '10:00'), slots: 2 }, NOW)
    expect(u.priceCents).toBe(5000)
    expect(await occupancyCount(tennis.id)).toBe(0)
    expect(await occupancyCount(basket.id)).toBe(8)
  })

  test('spostarsi di 15 minuti o passare da 1 a 2 slot non confligge con la prenotazione stessa', async () => {
    const m = await makeMember()
    const f = await makeField()
    const b = await book(m, f.id, '10:00')
    await updateBooking(asActor(m), b.id, { fieldId: f.id, start: fromRome(DAY, '10:15'), slots: 1 }, NOW)
    const u = await updateBooking(asActor(m), b.id, { fieldId: f.id, start: fromRome(DAY, '10:15'), slots: 2 }, NOW)
    expect(u.end).toEqual(fromRome(DAY, '12:15'))
    expect(await occupancyCount(f.id)).toBe(8)
  })

  test('nuovo slot occupato → OVERLAP e la prenotazione originale resta intatta', async () => {
    const [m, other] = [await makeMember(), await makeMember()]
    const f = await makeField()
    const b = await book(m, f.id, '10:00')
    await book(other, f.id, '12:00')
    const p = updateBooking(asActor(m), b.id, { fieldId: f.id, start: fromRome(DAY, '11:30'), slots: 1 }, NOW)
    expect(await violationsOf(p)).toEqual(['OVERLAP'])
    const after = await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })
    expect(after.start).toEqual(fromRome(DAY, '10:00'))
    expect(await prisma.occupancy.count({ where: { bookingId: b.id } })).toBe(4)
  })

  test('a meno di 2 ore dall\'inizio originale il socio non può modificare, l\'admin sì', async () => {
    const m = await makeMember()
    const admin = await makeMember({ isAdmin: true })
    const f = await makeField()
    const b = await book(m, f.id, '10:00')
    const late = fromRome(DAY, '08:30') // 1h30 prima
    const input = { fieldId: f.id, start: fromRome(DAY, '15:00'), slots: 1 }
    expect(await violationsOf(updateBooking(asActor(m), b.id, input, late))).toEqual(['WINDOW_CLOSED'])
    const u = await updateBooking(asActor(admin), b.id, input, late)
    expect(u.start).toEqual(fromRome(DAY, '15:00'))
  })

  test('la modifica non conta come nuova prenotazione (3 attive, modifica ok)', async () => {
    const m = await makeMember()
    const f = await makeField()
    const ids: string[] = []
    for (const from of ['08:00', '10:00', '12:00']) ids.push((await book(m, f.id, from)).id)
    await updateBooking(asActor(m), ids[0], { fieldId: f.id, start: fromRome(DAY, '16:00'), slots: 1 }, NOW)
    expect(await prisma.booking.count({ where: { status: 'CONFIRMED' } })).toBe(3)
  })

  test('verso il calcio con 1 slot la durata è 90 minuti', async () => {
    const m = await makeMember()
    const tennis = await makeField()
    const calcio = await makeField({ slotMinutes: 90, pricePerSlot: 6000 })
    const b = await book(m, tennis.id, '10:00')
    const u = await updateBooking(asActor(m), b.id, { fieldId: calcio.id, start: fromRome(DAY, '10:00'), slots: 1 }, NOW)
    expect(u.end).toEqual(fromRome(DAY, '11:30'))
    expect(u.priceCents).toBe(6000)
  })

  test('una prenotazione cancellata non è modificabile; un altro socio è respinto', async () => {
    const [m, other] = [await makeMember(), await makeMember()]
    const f = await makeField()
    const b = await book(m, f.id, '10:00')
    const input = { fieldId: f.id, start: fromRome(DAY, '15:00'), slots: 1 }
    expect(await violationsOf(updateBooking(asActor(other), b.id, input, NOW))).toEqual(['FORBIDDEN'])
    await cancelBooking(asActor(m), b.id, undefined, NOW)
    expect(await violationsOf(updateBooking(asActor(m), b.id, input, NOW))).toEqual(['ALREADY_CANCELLED'])
    expect(await occupancyCount()).toBe(0)
  })
})

describe('cancelBooking', () => {
  test('il socio cancella entro la finestra: slot libero di nuovo prenotabile', async () => {
    const [m, other] = [await makeMember(), await makeMember()]
    const f = await makeField()
    const b = await book(m, f.id, '10:00')
    const c = await cancelBooking(asActor(m), b.id, 'imprevisto', NOW)
    expect(c.status).toBe('CANCELLED')
    expect(c.cancelReason).toBe('imprevisto')
    expect(c.cancelledById).toBe(m.id)
    expect(c.chargeable).toBe(false)
    expect(await occupancyCount(f.id)).toBe(0)
    await book(other, f.id, '10:00')
  })

  test('a meno di 2 ore il socio non può cancellare', async () => {
    const m = await makeMember()
    const f = await makeField()
    const b = await book(m, f.id, '10:00')
    expect(await violationsOf(cancelBooking(asActor(m), b.id, undefined, fromRome(DAY, '08:30')))).toEqual(['WINDOW_CLOSED'])
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe('CONFIRMED')
  })

  test('cancellare due volte → ALREADY_CANCELLED, senza occupazione orfana', async () => {
    const m = await makeMember()
    const f = await makeField()
    const b = await book(m, f.id, '10:00')
    await cancelBooking(asActor(m), b.id, undefined, NOW)
    expect(await violationsOf(cancelBooking(asActor(m), b.id, undefined, NOW))).toEqual(['ALREADY_CANCELLED'])
    expect(await occupancyCount()).toBe(0)
  })

  test('un socio non può cancellare la prenotazione di un altro; id inesistente → NOT_FOUND', async () => {
    const [m, other] = [await makeMember(), await makeMember()]
    const f = await makeField()
    const b = await book(m, f.id, '10:00')
    expect(await violationsOf(cancelBooking(asActor(other), b.id, undefined, NOW))).toEqual(['FORBIDDEN'])
    expect(await violationsOf(cancelBooking(asActor(other), 'xxx', undefined, NOW))).toEqual(['NOT_FOUND'])
  })

  test('l\'admin cancella sempre: ≥2h prima non è dovuta, <2h prima va pagata (chargeable)', async () => {
    const admin = await makeMember({ isAdmin: true })
    const m = await makeMember()
    const f = await makeField()
    const early = await book(m, f.id, '10:00')
    const late = await book(m, f.id, '14:00')
    const c1 = await cancelBooking(asActor(admin), early.id, 'manutenzione', NOW)
    expect(c1).toMatchObject({ status: 'CANCELLED', cancelledById: admin.id, cancelReason: 'manutenzione', chargeable: false })
    const c2 = await cancelBooking(asActor(admin), late.id, undefined, fromRome(DAY, '13:00'))
    expect(c2).toMatchObject({ status: 'CANCELLED', chargeable: true })
    expect(await occupancyCount(f.id)).toBe(0)
  })
})
