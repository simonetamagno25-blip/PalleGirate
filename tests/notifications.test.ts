import { beforeEach, describe, expect, test } from 'vitest'
import { prisma } from '@backend/lib/db'
import {
  listNotifications,
  markAllRead,
  markRead,
  notify,
  unreadCount,
} from '@backend/lib/notifications'
import { makeMember, resetDb } from './helpers'

beforeEach(resetDb)

describe('notify', () => {
  test('crea una riga non letta con params serializzati in JSON', async () => {
    const m = await makeMember()
    expect(await notify(prisma, m.id, 'STRIKE_WARNING', { bookingId: 'b1', n: 1 })).toBe(true)
    const rows = await prisma.notification.findMany({ where: { userId: m.id } })
    expect(rows).toHaveLength(1)
    expect(rows[0].read).toBe(false)
    expect(rows[0].type).toBe('STRIKE_WARNING')
    expect(JSON.parse(rows[0].params)).toEqual({ bookingId: 'b1', n: 1 })
  })

  test('con la stessa dedupeKey la seconda chiamata ritorna false e non crea righe', async () => {
    const m = await makeMember()
    expect(await notify(prisma, m.id, 'BOOKING_REMINDER', {}, 'k1')).toBe(true)
    expect(await notify(prisma, m.id, 'BOOKING_REMINDER', {}, 'k1')).toBe(false)
    expect(await prisma.notification.count({ where: { userId: m.id } })).toBe(1)
  })

  test('la stessa dedupeKey su utenti diversi non confligge', async () => {
    const a = await makeMember()
    const b = await makeMember()
    expect(await notify(prisma, a.id, 'BOOKING_REMINDER', {}, 'k1')).toBe(true)
    expect(await notify(prisma, b.id, 'BOOKING_REMINDER', {}, 'k1')).toBe(true)
  })
})

describe('lettura e stato letto', () => {
  test('unreadCount e listNotifications riguardano solo l\'utente, più recenti prima', async () => {
    const a = await makeMember()
    const b = await makeMember()
    await notify(prisma, a.id, 'ACCOUNT_BLOCKED', { order: 1 })
    await prisma.notification.create({ data: { userId: a.id, type: 'ACCOUNT_UNBLOCKED', createdAt: new Date(Date.now() + 5000) } })
    await notify(prisma, b.id, 'ACCOUNT_BLOCKED', {})
    expect(await unreadCount(a.id)).toBe(2)
    const list = await listNotifications(a.id)
    expect(list.map((n) => n.type)).toEqual(['ACCOUNT_UNBLOCKED', 'ACCOUNT_BLOCKED'])
  })

  test('markRead su una notifica altrui non la modifica', async () => {
    const a = await makeMember()
    const b = await makeMember()
    await notify(prisma, b.id, 'ACCOUNT_BLOCKED', {})
    const [nb] = await prisma.notification.findMany({ where: { userId: b.id } })
    await markRead(a.id, nb.id)
    expect((await prisma.notification.findUnique({ where: { id: nb.id } }))!.read).toBe(false)
    await markRead(b.id, nb.id)
    expect((await prisma.notification.findUnique({ where: { id: nb.id } }))!.read).toBe(true)
  })

  test('markAllRead azzera solo le notifiche dell\'utente', async () => {
    const a = await makeMember()
    const b = await makeMember()
    await notify(prisma, a.id, 'ACCOUNT_BLOCKED', {})
    await notify(prisma, b.id, 'ACCOUNT_BLOCKED', {})
    await markAllRead(a.id)
    expect(await unreadCount(a.id)).toBe(0)
    expect(await unreadCount(b.id)).toBe(1)
  })
})
