import { beforeEach, describe, expect, test, vi } from 'vitest'

// Si simula solo il livello next-auth: requireMember/requireAdmin/getSessionUser restano quelli veri.
const authMock = vi.hoisted(() => vi.fn())
vi.mock('next-auth', () => ({
  default: () => ({ handlers: {}, auth: authMock, signIn: vi.fn(), signOut: vi.fn() }),
}))
vi.mock('next-auth/providers/credentials', () => ({ default: () => ({}) }))

import {
  adminCancelBookingAction,
  adminCreateBookingAction,
  adminUpdateBookingAction,
  cancelBookingAction,
  createBookingAction,
  previewPriceAction,
  updateBookingAction,
} from '@/app/[locale]/(app)/actions'
import { prisma } from '@/lib/db'
import { addDays, romeDay } from '@/lib/time'
import { makeField, makeMember, resetDb } from './helpers'

// Le azioni usano l'orologio reale: le date di prova sono relative a oggi.
const day = (n: number) => addDays(romeDay(new Date()), n)
const validUntilNextYear = () => new Date(Date.now() + 365 * 24 * 3600 * 1000)

async function activeMember(isAdmin = false) {
  const m = await makeMember({ isAdmin, expiresAt: validUntilNextYear() })
  return prisma.user.update({ where: { id: m.id }, data: { activatedAt: new Date() } })
}
const loginAs = (u: { id: string } | null) => authMock.mockResolvedValue(u ? { user: { id: u.id } } : null)

beforeEach(async () => {
  await resetDb()
  authMock.mockReset()
})

describe('azioni del socio', () => {
  test('senza sessione l\'azione non esegue nulla', async () => {
    loginAs(null)
    const f = await makeField()
    await expect(createBookingAction({ fieldId: f.id, day: day(3), time: '10:00', slots: 1 })).rejects.toThrow()
    expect(await prisma.booking.count()).toBe(0)
  })

  test('crea la prenotazione per il socio in sessione, anche se il client passa un memberId diverso', async () => {
    const me = await activeMember()
    const other = await activeMember()
    const f = await makeField()
    loginAs(me)
    const form = { fieldId: f.id, day: day(3), time: '10:00', slots: 1, memberId: other.id }
    const r = await createBookingAction(form as Parameters<typeof createBookingAction>[0])
    expect(r.ok).toBe(true)
    const b = await prisma.booking.findFirstOrThrow()
    expect(b.userId).toBe(me.id)
  })

  test('giorno, ora o slot malformati → INVALID_INPUT, senza eccezioni né prenotazioni', async () => {
    const me = await activeMember()
    const f = await makeField()
    loginAs(me)
    for (const bad of [
      { day: 'domani', time: '10:00', slots: 1 },
      { day: day(3), time: '25:99', slots: 1 },
      { day: '2027-02-30', time: '10:00', slots: 1 },
      { day: day(3), time: '10:00', slots: 'x' },
    ]) {
      const r = await createBookingAction({ fieldId: f.id, ...bad } as unknown as Parameters<typeof createBookingAction>[0])
      expect(r).toEqual({ ok: false, violations: ['INVALID_INPUT'] })
    }
    expect(await prisma.booking.count()).toBe(0)
  })

  test('le violazioni tornano come codici traducibili', async () => {
    const me = await activeMember()
    const other = await activeMember()
    const f = await makeField()
    loginAs(other)
    await createBookingAction({ fieldId: f.id, day: day(3), time: '10:00', slots: 1 })
    loginAs(me)
    expect(await createBookingAction({ fieldId: f.id, day: day(3), time: '10:30', slots: 1 })).toEqual({
      ok: false,
      violations: ['OVERLAP'],
    })
    expect(await createBookingAction({ fieldId: f.id, day: day(40), time: '10:00', slots: 1 })).toEqual({
      ok: false,
      violations: ['TOO_FAR_AHEAD'],
    })
  })

  test('modifica e cancella la propria prenotazione, non quella di un altro', async () => {
    const me = await activeMember()
    const other = await activeMember()
    const f = await makeField()
    loginAs(me)
    const created = await createBookingAction({ fieldId: f.id, day: day(5), time: '10:00', slots: 1 })
    if (!created.ok) throw new Error('prenotazione di prova non creata')

    const moved = await updateBookingAction(created.id, { fieldId: f.id, day: day(5), time: '12:00', slots: 2 })
    expect(moved.ok).toBe(true)
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: created.id } })).slots).toBe(2)

    loginAs(other)
    expect(await cancelBookingAction(created.id)).toEqual({ ok: false, violations: ['FORBIDDEN'] })
    expect(await updateBookingAction(created.id, { fieldId: f.id, day: day(5), time: '15:00', slots: 1 })).toEqual({
      ok: false,
      violations: ['FORBIDDEN'],
    })

    loginAs(me)
    expect(await cancelBookingAction(created.id, 'imprevisto')).toEqual({ ok: true })
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: created.id } })).status).toBe('CANCELLED')
  })

  test('previewPriceAction: slot × prezzo in centesimi; campo sconosciuto → 0', async () => {
    const me = await activeMember()
    const f = await makeField({ pricePerSlot: 1800 })
    loginAs(me)
    expect(await previewPriceAction(f.id, 2)).toBe(3600)
    expect(await previewPriceAction('nessuno', 1)).toBe(0)
  })
})

describe('un admin che è anche socio', () => {
  test('quando prenota per sé dalla pagina del socio valgono le regole del socio (spec §6)', async () => {
    const admin = await prisma.user.update({
      where: { id: (await activeMember(true)).id },
      data: { membership: { update: { expiresAt: new Date(Date.now() - 86400000) } } }, // tessera scaduta
    })
    const f = await makeField()
    loginAs(admin)
    expect(await createBookingAction({ fieldId: f.id, day: day(3), time: '10:00', slots: 1 })).toEqual({
      ok: false,
      violations: ['MEMBERSHIP_EXPIRED'],
    })
    expect(await prisma.booking.count()).toBe(0)
  })

  test('non può cancellare la propria prenotazione a meno di 2 ore dall\'inizio con l\'azione del socio', async () => {
    const admin = await activeMember(true)
    const f = await makeField()
    const soon = await prisma.booking.create({
      data: {
        userId: admin.id,
        fieldId: f.id,
        start: new Date(Date.now() + 30 * 60000),
        end: new Date(Date.now() + 90 * 60000),
        slots: 1,
        priceCents: 1800,
      },
    })
    loginAs(admin)
    expect(await cancelBookingAction(soon.id)).toEqual({ ok: false, violations: ['WINDOW_CLOSED'] })
  })
})

describe('adminUpdateBookingAction', () => {
  test('l\'admin sposta la prenotazione di un socio senza vincoli; un socio riceve FORBIDDEN', async () => {
    const admin = await activeMember(true)
    const member = await activeMember()
    const f = await makeField()
    loginAs(admin)
    const r = await adminCreateBookingAction({ memberId: member.id, fieldId: f.id, day: day(60), time: '10:00', slots: 1 })
    if (!r.ok) throw new Error('prenotazione di prova non creata')

    expect(await adminUpdateBookingAction(r.id, { fieldId: f.id, day: day(61), time: '11:00', slots: 2 })).toEqual({ ok: true })
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: r.id } })).slots).toBe(2)

    loginAs(member)
    await expect(adminUpdateBookingAction(r.id, { fieldId: f.id, day: day(61), time: '12:00', slots: 1 })).rejects.toThrow('FORBIDDEN')
  })
})

describe('azioni dell\'admin', () => {
  test('un socio che chiama un\'azione admin riceve FORBIDDEN e non succede nulla', async () => {
    const me = await activeMember()
    const f = await makeField()
    loginAs(me)
    await expect(
      adminCreateBookingAction({ memberId: me.id, fieldId: f.id, day: day(3), time: '10:00', slots: 1 }),
    ).rejects.toThrow('FORBIDDEN')
    expect(await prisma.booking.count()).toBe(0)
  })

  test('l\'admin crea per un socio e cancella con motivo', async () => {
    const admin = await activeMember(true)
    const member = await activeMember()
    const f = await makeField()
    loginAs(admin)
    const r = await adminCreateBookingAction({ memberId: member.id, fieldId: f.id, day: day(60), time: '10:00', slots: 1 })
    expect(r.ok).toBe(true) // oltre i 14 giorni: l'admin non ha vincoli
    if (!r.ok) return
    expect(await adminCancelBookingAction(r.id, 'manutenzione campo')).toEqual({ ok: true })
    const b = await prisma.booking.findUniqueOrThrow({ where: { id: r.id } })
    expect(b).toMatchObject({ status: 'CANCELLED', cancelReason: 'manutenzione campo', cancelledById: admin.id })
  })
})
