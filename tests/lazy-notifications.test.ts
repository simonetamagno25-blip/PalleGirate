import { beforeEach, describe, expect, test } from 'vitest'
import { prisma } from '@backend/lib/db'
import { runLazyNotifications } from '@backend/lib/lazy-notifications'
import { renewMembership } from '@backend/lib/members'
import { fromRome } from '@backend/lib/time'
import { makeBooking, makeField, makeMember, NOW, resetDb } from './helpers'

const notesOf = (userId: string, type: string) =>
  prisma.notification.findMany({ where: { userId, type }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })

beforeEach(resetDb)

describe('promemoria prenotazione', () => {
  test('una sola notifica anche con più chiamate, anche simultanee', async () => {
    const m = await makeMember()
    const f = await makeField({ name: 'Tennis Z' })
    const b = await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-13', '13:30') })
    await runLazyNotifications(m.id, NOW)
    await runLazyNotifications(m.id, NOW)
    await Promise.all([runLazyNotifications(m.id, NOW), runLazyNotifications(m.id, NOW), runLazyNotifications(m.id, NOW)])
    const notes = await notesOf(m.id, 'BOOKING_REMINDER')
    expect(notes).toHaveLength(1)
    expect(JSON.parse(notes[0].params)).toMatchObject({ bookingId: b.id, fieldName: 'Tennis Z' })
  })

  test('niente per prenotazioni cancellate, già iniziate o oltre la finestra (default 2 ore)', async () => {
    const m = await makeMember()
    const f = await makeField()
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-13', '13:30'), status: 'CANCELLED' })
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-13', '11:30') })
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-13', '15:00') })
    await runLazyNotifications(m.id, NOW)
    expect(await notesOf(m.id, 'BOOKING_REMINDER')).toHaveLength(0)
  })

  test('esattamente alla soglia (start = now + reminderHours) il promemoria c\'è', async () => {
    const m = await makeMember()
    const f = await makeField()
    await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-13', '14:00') })
    await runLazyNotifications(m.id, NOW)
    expect(await notesOf(m.id, 'BOOKING_REMINDER')).toHaveLength(1)
  })

  test('spostando la prenotazione nasce un nuovo promemoria', async () => {
    const m = await makeMember()
    const f = await makeField()
    const b = await makeBooking({ userId: m.id, fieldId: f.id, start: fromRome('2026-10-13', '13:30') })
    await runLazyNotifications(m.id, NOW)
    await prisma.booking.update({ where: { id: b.id }, data: { start: fromRome('2026-10-13', '13:45') } })
    await runLazyNotifications(m.id, NOW)
    expect(await notesOf(m.id, 'BOOKING_REMINDER')).toHaveLength(2)
  })

  test('non notifica prenotazioni di altri utenti', async () => {
    const [a, b] = [await makeMember(), await makeMember()]
    const f = await makeField()
    await makeBooking({ userId: b.id, fieldId: f.id, start: fromRome('2026-10-13', '13:30') })
    await runLazyNotifications(a.id, NOW)
    expect(await prisma.notification.count()).toBe(0)
  })
})

describe('tessera', () => {
  const withExpiry = (day: string) => makeMember({ expiresAt: fromRome(day, '12:00') })

  test('a 15 giorni → MEMBERSHIP_EXPIRING, a 16 → niente', async () => {
    const near = await withExpiry('2026-10-28')
    const far = await withExpiry('2026-10-29')
    await runLazyNotifications(near.id, NOW)
    await runLazyNotifications(far.id, NOW)
    const [n] = await notesOf(near.id, 'MEMBERSHIP_EXPIRING')
    expect(JSON.parse(n.params)).toEqual({ expiresOn: '2026-10-28', daysLeft: 15 })
    expect(await prisma.notification.count({ where: { userId: far.id } })).toBe(0)
  })

  test('scade oggi → EXPIRING con daysLeft 0; scaduta ieri → EXPIRED (una volta sola)', async () => {
    const today = await withExpiry('2026-10-13')
    const gone = await withExpiry('2026-10-12')
    await runLazyNotifications(today.id, NOW)
    expect(JSON.parse((await notesOf(today.id, 'MEMBERSHIP_EXPIRING'))[0].params)).toMatchObject({ daysLeft: 0 })
    await runLazyNotifications(gone.id, NOW)
    await runLazyNotifications(gone.id, NOW)
    expect(await notesOf(gone.id, 'MEMBERSHIP_EXPIRED')).toHaveLength(1)
    expect(await notesOf(gone.id, 'MEMBERSHIP_EXPIRING')).toHaveLength(0)
  })

  test('dopo il rinnovo la nuova scadenza non genera nulla; avvicinandosi genera un nuovo avviso', async () => {
    const admin = await makeMember({ isAdmin: true, expiresAt: null })
    const m = await withExpiry('2026-10-20')
    await runLazyNotifications(m.id, NOW)
    expect(await notesOf(m.id, 'MEMBERSHIP_EXPIRING')).toHaveLength(1)
    await renewMembership({ id: admin.id, isAdmin: true }, m.id, { expiresAt: fromRome('2027-10-20', '12:00') }, NOW)
    await runLazyNotifications(m.id, NOW)
    expect(await notesOf(m.id, 'MEMBERSHIP_EXPIRING')).toHaveLength(1)
    await runLazyNotifications(m.id, fromRome('2027-10-10', '12:00'))
    expect(await notesOf(m.id, 'MEMBERSHIP_EXPIRING')).toHaveLength(2)
  })

  test('utente senza tessera (admin del seed) → nessuna notifica di tessera', async () => {
    const admin = await makeMember({ isAdmin: true, expiresAt: null })
    await runLazyNotifications(admin.id, NOW)
    expect(await prisma.notification.count({ where: { userId: admin.id } })).toBe(0)
  })

  test('cambio ora legale: scadenza 26/10 a mezzogiorno, ora = 25/10 23:30 → daysLeft 1', async () => {
    const m = await withExpiry('2026-10-26')
    await runLazyNotifications(m.id, fromRome('2026-10-25', '23:30'))
    expect(JSON.parse((await notesOf(m.id, 'MEMBERSHIP_EXPIRING'))[0].params)).toMatchObject({ daysLeft: 1 })
  })

  test('utente inesistente: non lancia', async () => {
    await expect(runLazyNotifications('inesistente', NOW)).resolves.toBeUndefined()
  })
})
