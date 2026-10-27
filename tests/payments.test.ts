import { beforeEach, describe, expect, test } from 'vitest'
import { prisma } from '@backend/lib/db'
import { isBlocked } from '@backend/lib/booking-rules'
import { BookingError, createBooking, type Actor } from '@backend/lib/booking-service'
import { getMemberLedger, getStandingsByUser, listPendingPayments, registerPayment, setNoShow } from '@backend/lib/payments'
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

/** Prenotazione conclusa (giorno n di ottobre 2026, prima di NOW = 13/10 12:00). */
const past = (userId: string, fieldId: string, n: number, over: Parameters<typeof makeBooking>[0] extends infer T ? Partial<T> : never = {}) =>
  makeBooking({ userId, fieldId, start: fromRome(`2026-10-0${n}`, '10:00'), ...over })

const future = (userId: string, fieldId: string, day: string, from = '10:00', over = {}) =>
  makeBooking({ userId, fieldId, start: fromRome(day, from), ...over })

const strikesOf = (userId: string) => prisma.strike.count({ where: { userId } })
const notesOf = (userId: string, type?: string) =>
  prisma.notification.findMany({ where: { userId, ...(type ? { type } : {}) } })

let admin: Awaited<ReturnType<typeof makeMember>>
let member: Awaited<ReturnType<typeof makeMember>>
let field: Awaited<ReturnType<typeof makeField>>

beforeEach(async () => {
  await resetDb()
  admin = await makeMember({ isAdmin: true, expiresAt: null })
  member = await makeMember()
  field = await makeField({ pricePerSlot: 1800 })
})

const pay = (id: string, outcome: 'PAID' | 'UNPAID' | 'EXEMPT') => registerPayment(asActor(admin), id, outcome, NOW)

describe('strike e blocco', () => {
  test('il 1° insoluto crea uno strike e la notifica di avviso, senza bloccare', async () => {
    const b = await past(member.id, field.id, 1)
    const updated = await pay(b.id, 'UNPAID')
    expect(updated.paymentStatus).toBe('UNPAID')
    expect(await strikesOf(member.id)).toBe(1)
    expect(await notesOf(member.id, 'STRIKE_WARNING')).toHaveLength(1)
    expect(await notesOf(member.id, 'ACCOUNT_BLOCKED')).toHaveLength(0)
    const ledger = await getMemberLedger(asActor(admin), member.id)
    expect(ledger.blocked).toBe(false)
  })

  test('il 2° insoluto blocca e cancella solo le future CONFIRMED, con notifiche', async () => {
    const first = await past(member.id, field.id, 1)
    const second = await past(member.id, field.id, 2)
    const fut1 = await future(member.id, field.id, '2026-10-20')
    const fut2 = await future(member.id, field.id, '2026-10-21')
    // In corso: iniziata alle 11:30, finisce alle 12:30 (NOW = 12:00).
    const ongoing = await future(member.id, field.id, '2026-10-13', '11:30')
    const ended = await future(member.id, field.id, '2026-10-13', '08:00', { paymentStatus: 'PAID' })
    const alreadyCancelled = await future(member.id, field.id, '2026-10-22', '10:00', { status: 'CANCELLED' })

    await pay(first.id, 'UNPAID')
    await pay(second.id, 'UNPAID')

    expect(await strikesOf(member.id)).toBe(2)
    expect((await getMemberLedger(asActor(admin), member.id)).blocked).toBe(true)
    for (const id of [fut1.id, fut2.id]) {
      const b = await prisma.booking.findUniqueOrThrow({ where: { id } })
      expect(b).toMatchObject({ status: 'CANCELLED', cancelReason: 'AUTO_BLOCK', cancelledById: null, chargeable: false })
    }
    expect(await prisma.occupancy.count({ where: { bookingId: { in: [fut1.id, fut2.id] } } })).toBe(0)
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: ongoing.id } })).status).toBe('CONFIRMED')
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: ended.id } })).status).toBe('CONFIRMED')
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: alreadyCancelled.id } })).cancelReason).toBeNull()

    const cancelled = await notesOf(member.id, 'BOOKING_CANCELLED')
    expect(cancelled).toHaveLength(2)
    expect(JSON.parse(cancelled[0].params)).toMatchObject({ by: 'system', reason: 'AUTO_BLOCK' })
    expect(await notesOf(member.id, 'ACCOUNT_BLOCKED')).toHaveLength(1)
  })

  test('3° e 4° insoluto bloccano di nuovo subito, anche dopo uno sblocco', async () => {
    const [b1, b2, b3, b4] = await Promise.all([1, 2, 3, 4].map((n) => past(member.id, field.id, n)))
    await pay(b1.id, 'UNPAID')
    await pay(b2.id, 'UNPAID')
    await pay(b1.id, 'PAID')
    await pay(b2.id, 'PAID')
    expect((await getMemberLedger(asActor(admin), member.id)).blocked).toBe(false)

    const fut = await future(member.id, field.id, '2026-10-20')
    await pay(b3.id, 'UNPAID')
    expect(await strikesOf(member.id)).toBe(3)
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: fut.id } })).status).toBe('CANCELLED')
    expect((await getMemberLedger(asActor(admin), member.id)).blocked).toBe(true)

    const fut2 = await future(member.id, field.id, '2026-10-21')
    await pay(b4.id, 'UNPAID')
    expect(await strikesOf(member.id)).toBe(4)
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: fut2.id } })).status).toBe('CANCELLED')
  })

  test('sblocco: salda l\'ultimo insoluto → ACCOUNT_UNBLOCKED, gli strike restano', async () => {
    const [b1, b2] = await Promise.all([1, 2].map((n) => past(member.id, field.id, n)))
    await pay(b1.id, 'UNPAID')
    await pay(b2.id, 'UNPAID')
    await pay(b1.id, 'PAID')
    expect(await notesOf(member.id, 'ACCOUNT_UNBLOCKED')).toHaveLength(0)
    expect((await getMemberLedger(asActor(admin), member.id)).blocked).toBe(true)
    await pay(b2.id, 'PAID')
    expect(await notesOf(member.id, 'ACCOUNT_UNBLOCKED')).toHaveLength(1)
    expect(await strikesOf(member.id)).toBe(2)
    expect((await getMemberLedger(asActor(admin), member.id)).blocked).toBe(false)
  })

  test('UNPAID→EXEMPT elimina lo strike; PENDING→EXEMPT non ne crea', async () => {
    const [b1, b2] = await Promise.all([1, 2].map((n) => past(member.id, field.id, n)))
    await pay(b1.id, 'UNPAID')
    expect(await strikesOf(member.id)).toBe(1)
    await pay(b1.id, 'EXEMPT')
    expect(await strikesOf(member.id)).toBe(0)
    await pay(b2.id, 'EXEMPT')
    expect(await strikesOf(member.id)).toBe(0)
  })

  test('UNPAID→EXEMPT dell\'ultimo insoluto di un socio bloccato lo sblocca', async () => {
    const [b1, b2] = await Promise.all([1, 2].map((n) => past(member.id, field.id, n)))
    await pay(b1.id, 'UNPAID')
    await pay(b2.id, 'UNPAID')
    await pay(b1.id, 'PAID')
    await pay(b2.id, 'EXEMPT')
    expect(await strikesOf(member.id)).toBe(1) // lo strike di b1 resta: era un vero mancato pagamento
    expect((await getMemberLedger(asActor(admin), member.id)).blocked).toBe(false)
    expect(await notesOf(member.id, 'ACCOUNT_UNBLOCKED')).toHaveLength(1)
  })
})

describe('chi e cosa si può registrare', () => {
  test('una cancellata chargeable è pagabile e un UNPAID conta come insoluto; una non chargeable → NOT_PAYABLE', async () => {
    const charge = await past(member.id, field.id, 1, { status: 'CANCELLED', chargeable: true })
    const free = await past(member.id, field.id, 2, { status: 'CANCELLED' })
    expect(await codesOf(pay(free.id, 'PAID'))).toEqual(['NOT_PAYABLE'])
    await pay(charge.id, 'UNPAID')
    const ledger = await getMemberLedger(asActor(admin), member.id)
    expect(ledger).toMatchObject({ strikes: 1, unpaidCount: 1, debtCents: 1800 })
  })

  test('prenotazione non ancora conclusa → NOT_ENDED', async () => {
    const ongoing = await future(member.id, field.id, '2026-10-13', '11:30')
    expect(await codesOf(pay(ongoing.id, 'PAID'))).toEqual(['NOT_ENDED'])
  })

  test('transizioni non ammesse → INVALID_TRANSITION', async () => {
    const b = await past(member.id, field.id, 1)
    await pay(b.id, 'PAID')
    expect(await codesOf(pay(b.id, 'UNPAID'))).toEqual(['INVALID_TRANSITION'])
    expect(await codesOf(pay(b.id, 'PAID'))).toEqual(['INVALID_TRANSITION'])
    expect(await strikesOf(member.id)).toBe(0)
  })

  test('un socio non può registrare pagamenti; id inesistente → NOT_FOUND', async () => {
    const b = await past(member.id, field.id, 1)
    expect(await codesOf(registerPayment(asActor(member), b.id, 'PAID', NOW))).toEqual(['FORBIDDEN'])
    expect(await codesOf(pay('inesistente', 'PAID'))).toEqual(['NOT_FOUND'])
    await expect(listPendingPayments(asActor(member), NOW)).rejects.toBeInstanceOf(BookingError)
  })

  test('listPendingPayments: solo PENDING concluse, confermate o cancellate chargeable, per fine crescente', async () => {
    const later = await past(member.id, field.id, 3)
    const earlier = await past(member.id, field.id, 1)
    const charge = await past(member.id, field.id, 2, { status: 'CANCELLED', chargeable: true })
    await past(member.id, field.id, 4, { paymentStatus: 'PAID' })
    await past(member.id, field.id, 5, { status: 'CANCELLED' })
    await future(member.id, field.id, '2026-10-20')
    const list = await listPendingPayments(asActor(admin), NOW)
    expect(list.map((b) => b.id)).toEqual([earlier.id, charge.id, later.id])
    expect(list[0].user.id).toBe(member.id)
    expect(list[0].field.id).toBe(field.id)
  })

  test('setNoShow imposta solo il flag statistico', async () => {
    const b = await past(member.id, field.id, 1)
    await setNoShow(asActor(admin), b.id, true)
    const after = await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })
    expect(after).toMatchObject({ noShow: true, paymentStatus: 'PENDING' })
    await expect(setNoShow(asActor(member), b.id, false)).rejects.toBeInstanceOf(BookingError)
  })
})

describe('concorrenza e rapporto col servizio di prenotazione', () => {
  test('due registrazioni UNPAID simultanee: una riesce, l\'altra INVALID_TRANSITION, 1 strike e 1 notifica', async () => {
    const b = await past(member.id, field.id, 1)
    const results = await Promise.allSettled([pay(b.id, 'UNPAID'), pay(b.id, 'UNPAID')])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult
    expect((rejected.reason as BookingError).violations).toEqual(['INVALID_TRANSITION'])
    expect(await strikesOf(member.id)).toBe(1)
    expect(await notesOf(member.id, 'STRIKE_WARNING')).toHaveLength(1)
  })

  test('getMemberLedger: debito = somma degli UNPAID; il socio bloccato non prenota finché non salda', async () => {
    const [b1, b2] = await Promise.all([1, 2].map((n) => past(member.id, field.id, n)))
    await pay(b1.id, 'UNPAID')
    await pay(b2.id, 'UNPAID')
    expect(await getMemberLedger(asActor(admin), member.id)).toMatchObject({ strikes: 2, unpaidCount: 2, debtCents: 3600, blocked: true })
    const input = { memberId: member.id, fieldId: field.id, start: fromRome('2026-10-20', '10:00'), slots: 1 }
    expect(await codesOf(createBooking(asActor(member), input, NOW))).toContain('BLOCKED')
    await pay(b1.id, 'PAID')
    await pay(b2.id, 'PAID')
    await expect(createBooking(asActor(member), input, NOW)).resolves.toMatchObject({ status: 'CONFIRMED' })
  })

  test('un admin-socio bloccato: come socio BLOCKED, come admin riesce', async () => {
    const both = await makeMember({ isAdmin: true })
    const [b1, b2] = await Promise.all([1, 2].map((n) => past(both.id, field.id, n)))
    await pay(b1.id, 'UNPAID')
    await pay(b2.id, 'UNPAID')
    expect(isBlocked({ strikes: 2, unpaidCount: 2 })).toBe(true)
    const input = { memberId: both.id, fieldId: field.id, start: fromRome('2026-10-20', '10:00'), slots: 1 }
    expect(await codesOf(createBooking({ id: both.id, isAdmin: false }, input, NOW))).toContain('BLOCKED')
    await expect(createBooking({ id: both.id, isAdmin: true }, input, NOW)).resolves.toMatchObject({ status: 'CONFIRMED' })
  })
})

describe('getStandingsByUser', () => {
  test('strike, insoluti e blocco per più soci in una chiamata, anche per chi non ha nulla', async () => {
    const other = await makeMember()
    const [b1, b2] = await Promise.all([1, 2].map((n) => past(member.id, field.id, n)))
    await pay(b1.id, 'UNPAID')
    expect((await getStandingsByUser(asActor(admin), [member.id, other.id])).get(member.id)).toEqual({ strikes: 1, unpaidCount: 1, blocked: false })
    await pay(b2.id, 'UNPAID')
    const map = await getStandingsByUser(asActor(admin), [member.id, other.id])
    expect(map.get(member.id)).toEqual({ strikes: 2, unpaidCount: 2, blocked: true })
    expect(map.get(other.id)).toEqual({ strikes: 0, unpaidCount: 0, blocked: false })
    await expect(getStandingsByUser(asActor(member), [member.id])).rejects.toBeInstanceOf(BookingError)
  })
})
