import { beforeEach, describe, expect, test } from 'vitest'
import { DEFAULT_SETTINGS, type Settings } from '@backend/lib/booking-rules'
import { createField, setFieldActive, updateField, updateSettings } from '@backend/lib/admin-config'
import { BookingError, createBooking, type Actor } from '@backend/lib/booking-service'
import { prisma } from '@backend/lib/db'
import { getSettings } from '@backend/lib/settings'
import { fromRome } from '@backend/lib/time'
import { makeBooking, makeField, makeMember, NOW, resetDb } from './helpers'

const asActor = (u: { id: string; isAdmin: boolean }): Actor => ({ id: u.id, isAdmin: u.isAdmin })

function codesOf(p: Promise<unknown>) {
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

const settings = (over: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...over })

let admin: Awaited<ReturnType<typeof makeMember>>

beforeEach(async () => {
  await resetDb()
  admin = await makeMember({ isAdmin: true, expiresAt: null })
})

describe('updateSettings', () => {
  test('salva e getSettings restituisce i nuovi valori', async () => {
    await updateSettings(asActor(admin), settings({ maxActiveBookings: 5, openMinutes: 9 * 60, reminderHours: 4 }))
    expect(await getSettings()).toMatchObject({ maxActiveBookings: 5, openMinutes: 540, reminderHours: 4 })
    await updateSettings(asActor(admin), settings({ maxActiveBookings: 6 }))
    expect((await getSettings()).maxActiveBookings).toBe(6)
  })

  test.each([
    ['apertura = chiusura', { openMinutes: 600, closeMinutes: 600 }],
    ['apertura dopo la chiusura', { openMinutes: 1200, closeMinutes: 600 }],
    ['passo di 10 minuti', { stepMinutes: 10 }],
    ['apertura non multipla del passo', { openMinutes: 485 }],
    ['max prenotazioni attive 0', { maxActiveBookings: 0 }],
    ['anticipo 0 giorni', { maxAdvanceDays: 0 }],
    ['finestra negativa', { changeWindowHours: -1 }],
    ['slot per prenotazione 0', { maxSlotsPerBooking: 0 }],
    ['promemoria 0 ore', { reminderHours: 0 }],
    ['valore non intero', { maxAdvanceDays: 1.5 }],
  ])('rifiuta: %s', async (_name, over) => {
    expect(await codesOf(updateSettings(asActor(admin), settings(over)))).toEqual(['INVALID_SETTINGS'])
    expect(await prisma.settings.count()).toBe(0)
  })

  test('un socio non può modificare le impostazioni', async () => {
    const m = await makeMember()
    expect(await codesOf(updateSettings(asActor(m), settings()))).toEqual(['FORBIDDEN'])
  })

  test('con maxActiveBookings = 1 il secondo createBooking del socio → MAX_ACTIVE_REACHED', async () => {
    await updateSettings(asActor(admin), settings({ maxActiveBookings: 1 }))
    const m = await makeMember()
    const f = await makeField()
    const book = (from: string) =>
      createBooking(asActor(m), { memberId: m.id, fieldId: f.id, start: fromRome('2026-10-20', from), slots: 1 }, NOW)
    await book('10:00')
    expect(await codesOf(book('12:00'))).toEqual(['MAX_ACTIVE_REACHED'])
  })
})

describe('campi', () => {
  const input = { name: 'Padel', sport: 'padel', slotMinutes: 60, pricePerSlot: 2200 }

  test('createField crea un campo attivo; rifiuta nome duplicato, prezzo e durata non validi', async () => {
    const f = await createField(asActor(admin), input)
    expect(f).toMatchObject({ name: 'Padel', active: true, pricePerSlot: 2200 })
    expect(await codesOf(createField(asActor(admin), input))).toEqual(['DUPLICATE_FIELD_NAME'])
    expect(await codesOf(createField(asActor(admin), { ...input, name: 'A', pricePerSlot: 0 }))).toEqual(['INVALID_FIELD'])
    expect(await codesOf(createField(asActor(admin), { ...input, name: 'B', slotMinutes: 0 }))).toEqual(['INVALID_FIELD'])
    expect(await codesOf(createField(asActor(admin), { ...input, name: 'C', slotMinutes: 50 }))).toEqual(['INVALID_FIELD'])
    expect(await codesOf(createField(asActor(admin), { ...input, name: '  ' }))).toEqual(['INVALID_FIELD'])
  })

  test('updateField: il nuovo prezzo non tocca le prenotazioni esistenti; la durata con future → HAS_FUTURE_BOOKINGS', async () => {
    const m = await makeMember()
    const f = await makeField({ pricePerSlot: 1800 })
    const b = await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-20', '10:00') })
    const same = { name: f.name, sport: f.sport, slotMinutes: 60, pricePerSlot: 2500 }
    await updateField(asActor(admin), f.id, same, NOW)
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).priceCents).toBe(1800)
    expect(await codesOf(updateField(asActor(admin), f.id, { ...same, slotMinutes: 90 }, NOW))).toEqual(['HAS_FUTURE_BOOKINGS'])
    expect((await prisma.field.findUniqueOrThrow({ where: { id: f.id } })).slotMinutes).toBe(60)
    const other = await makeField()
    expect(await codesOf(updateField(asActor(admin), f.id, { ...same, name: other.name }, NOW))).toEqual(['DUPLICATE_FIELD_NAME'])
  })

  test('setFieldActive(false) con future: senza conferma → HAS_FUTURE_BOOKINGS e nulla cambia', async () => {
    const m = await makeMember()
    const f = await makeField()
    const b = await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-20', '10:00') })
    expect(await codesOf(setFieldActive(asActor(admin), f.id, false, undefined, NOW))).toEqual(['HAS_FUTURE_BOOKINGS'])
    expect((await prisma.field.findUniqueOrThrow({ where: { id: f.id } })).active).toBe(true)
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe('CONFIRMED')
  })

  test('con cancelFuture cancella con motivo, libera l\'occupazione e notifica; poi FIELD_INACTIVE; riattivando si prenota', async () => {
    const m = await makeMember()
    const f = await makeField({ name: 'Bocce X' })
    const b = await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-20', '10:00') })
    const past = await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-05', '10:00') })

    const res = await setFieldActive(asActor(admin), f.id, false, { cancelFuture: true }, NOW)
    expect(res).toEqual({ cancelled: 1 })
    expect(await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).toMatchObject({
      status: 'CANCELLED',
      cancelReason: 'FIELD_DEACTIVATED',
      cancelledById: admin.id,
      chargeable: false,
    })
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: past.id } })).status).toBe('CONFIRMED')
    expect(await prisma.occupancy.count({ where: { bookingId: b.id } })).toBe(0)
    const [n] = await prisma.notification.findMany({ where: { userId: m.id, type: 'BOOKING_CANCELLED' } })
    expect(JSON.parse(n.params)).toMatchObject({ by: 'admin', reason: 'FIELD_DEACTIVATED', fieldName: 'Bocce X' })

    const input = { memberId: m.id, fieldId: f.id, start: fromRome('2026-10-21', '10:00'), slots: 1 }
    expect(await codesOf(createBooking(asActor(m), input, NOW))).toEqual(['FIELD_INACTIVE'])
    await setFieldActive(asActor(admin), f.id, true, undefined, NOW)
    await expect(createBooking(asActor(m), input, NOW)).resolves.toMatchObject({ status: 'CONFIRMED' })
  })

  test('disattivare un campo senza future non richiede conferma; un socio non può', async () => {
    const f = await makeField()
    expect(await setFieldActive(asActor(admin), f.id, false, undefined, NOW)).toEqual({ cancelled: 0 })
    const m = await makeMember()
    expect(await codesOf(setFieldActive(asActor(m), f.id, true, undefined, NOW))).toEqual(['FORBIDDEN'])
    expect(await codesOf(setFieldActive(asActor(admin), 'inesistente', true, undefined, NOW))).toEqual(['NOT_FOUND'])
  })
})
