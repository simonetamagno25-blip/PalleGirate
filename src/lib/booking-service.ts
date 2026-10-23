// Creazione, modifica e cancellazione delle prenotazioni (spec §7).
// Le regole stanno in `booking-rules`; qui si caricano i dati e si scrive tutto in una transazione.
// L'anti-sovrapposizione è garantita dall'indice univoco su Occupancy(fieldId, quarterStart).
import { Prisma, type Booking, type Field } from '@prisma/client'
import { prisma } from '@/lib/db'
import { notify, type NotificationType } from '@/lib/notifications'
import { getSettings } from '@/lib/settings'
import {
  canChangeOrCancel,
  checkAdminRules,
  checkMemberRules,
  isBlocked,
  quarterStarts,
  VIOLATIONS,
  type Settings,
} from '@/lib/booking-rules'

export type Actor = { id: string; isAdmin: boolean }

export const BOOKING_ERROR_CODES = [
  ...VIOLATIONS,
  'NOT_FOUND',
  'FORBIDDEN',
  'ALREADY_CANCELLED',
  'WINDOW_CLOSED',
  'FIELD_INACTIVE',
  'NOT_PAYABLE',
  'NOT_ENDED',
  'INVALID_TRANSITION',
] as const

export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number]

export class BookingError extends Error {
  violations: BookingErrorCode[]
  constructor(violations: BookingErrorCode[]) {
    super(violations.join(', '))
    this.name = 'BookingError'
    this.violations = violations
  }
}

type Tx = Prisma.TransactionClient

const MINUTE = 60_000

const loadSettings = (tx: Tx): Promise<Settings> => getSettings(tx)

/** Una violazione dell'indice univoco di Occupancy significa che il campo è già occupato. */
async function guardOverlap<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new BookingError(['OVERLAP'])
    }
    throw e
  }
}

type Target = { memberId: string; field: Field; start: Date; slots: number }

/** Controlla le regole per il tipo di attore e restituisce fine e prezzo della prenotazione. */
async function validate(
  tx: Tx,
  actor: Actor,
  t: Target,
  now: Date,
  settings: Settings,
  excludeBookingId?: string,
): Promise<{ end: Date; priceCents: number }> {
  if (!Number.isInteger(t.slots)) throw new BookingError(['BAD_DURATION'])
  const end = new Date(t.start.getTime() + t.slots * t.field.slotMinutes * MINUTE)
  const base = { start: t.start, end, settings, fieldSlotMinutes: t.field.slotMinutes }

  const violations = actor.isAdmin
    ? checkAdminRules(base)
    : checkMemberRules({
        ...base,
        now,
        membershipExpiresAt: (await tx.membership.findUnique({ where: { userId: t.memberId } }))?.expiresAt ?? null,
        activeCount: await tx.booking.count({
          where: {
            userId: t.memberId,
            status: 'CONFIRMED',
            start: { gt: now },
            ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
          },
        }),
        blocked: isBlocked({
          strikes: await tx.strike.count({ where: { userId: t.memberId } }),
          unpaidCount: await tx.booking.count({ where: { userId: t.memberId, paymentStatus: 'UNPAID' } }),
        }),
      })
  if (violations.length > 0) throw new BookingError(violations)
  return { end, priceCents: t.slots * t.field.pricePerSlot }
}

async function loadField(tx: Tx, fieldId: string): Promise<Field> {
  const field = await tx.field.findUnique({ where: { id: fieldId } })
  if (!field) throw new BookingError(['NOT_FOUND'])
  if (!field.active) throw new BookingError(['FIELD_INACTIVE'])
  return field
}

async function loadOwnBooking(tx: Tx, actor: Actor, bookingId: string): Promise<Booking> {
  const booking = await tx.booking.findUnique({ where: { id: bookingId } })
  if (!booking) throw new BookingError(['NOT_FOUND'])
  if (!actor.isAdmin && booking.userId !== actor.id) throw new BookingError(['FORBIDDEN'])
  if (booking.status === 'CANCELLED') throw new BookingError(['ALREADY_CANCELLED'])
  return booking
}

/** Notifica al proprietario della prenotazione, qualunque sia l'attore (spec §9). */
function notifyBooking(
  tx: Tx,
  type: NotificationType,
  booking: Booking,
  fieldName: string,
  actor: Actor,
  reason: string | null = null,
) {
  return notify(tx, booking.userId, type, {
    bookingId: booking.id,
    fieldName,
    start: booking.start.toISOString(),
    by: actor.isAdmin ? 'admin' : 'member',
    reason,
  })
}

function occupancyRows(bookingId: string, fieldId: string, start: Date, end: Date) {
  return quarterStarts(start, end).map((quarterStart) => ({ bookingId, fieldId, quarterStart }))
}

export async function createBooking(
  actor: Actor,
  input: { memberId: string; fieldId: string; start: Date; slots: number },
  now: Date = new Date(),
): Promise<Booking> {
  if (!actor.isAdmin && input.memberId !== actor.id) throw new BookingError(['FORBIDDEN'])
  return guardOverlap(() =>
    prisma.$transaction(async (tx) => {
      const settings = await loadSettings(tx)
      const member = await tx.user.findUnique({ where: { id: input.memberId } })
      if (!member) throw new BookingError(['NOT_FOUND'])
      const field = await loadField(tx, input.fieldId)
      const { end, priceCents } = await validate(
        tx,
        actor,
        { memberId: member.id, field, start: input.start, slots: input.slots },
        now,
        settings,
      )
      const booking = await tx.booking.create({
        data: { userId: member.id, fieldId: field.id, start: input.start, end, slots: input.slots, priceCents },
      })
      await tx.occupancy.createMany({ data: occupancyRows(booking.id, field.id, input.start, end) })
      await notifyBooking(tx, 'BOOKING_CREATED', booking, field.name, actor)
      return booking
    }),
  )
}

export function updateBooking(
  actor: Actor,
  bookingId: string,
  input: { fieldId: string; start: Date; slots: number },
  now: Date = new Date(),
): Promise<Booking> {
  return guardOverlap(() =>
    prisma.$transaction(async (tx) => {
      const settings = await loadSettings(tx)
      const booking = await loadOwnBooking(tx, actor, bookingId)
      if (!actor.isAdmin && !canChangeOrCancel(booking.start, now, settings)) {
        throw new BookingError(['WINDOW_CLOSED'])
      }
      const field = await loadField(tx, input.fieldId)
      const { end, priceCents } = await validate(
        tx,
        actor,
        { memberId: booking.userId, field, start: input.start, slots: input.slots },
        now,
        settings,
        booking.id,
      )
      // Si libera prima l'occupazione vecchia: lo spostamento non confligge con sé stesso.
      await tx.occupancy.deleteMany({ where: { bookingId: booking.id } })
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: { fieldId: field.id, start: input.start, end, slots: input.slots, priceCents },
      })
      await tx.occupancy.createMany({ data: occupancyRows(booking.id, field.id, input.start, end) })
      await notifyBooking(tx, 'BOOKING_UPDATED', updated, field.name, actor)
      return updated
    }),
  )
}

export function cancelBooking(
  actor: Actor,
  bookingId: string,
  reason?: string,
  now: Date = new Date(),
): Promise<Booking> {
  return prisma.$transaction(async (tx) => {
    const settings = await loadSettings(tx)
    const booking = await loadOwnBooking(tx, actor, bookingId)
    const inWindow = canChangeOrCancel(booking.start, now, settings)
    if (!actor.isAdmin && !inWindow) throw new BookingError(['WINDOW_CLOSED'])
    await tx.occupancy.deleteMany({ where: { bookingId: booking.id } })
    const cancelled = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        cancelReason: reason?.trim() || null,
        cancelledById: actor.id,
        // Cancellazione dell'admin a meno di 2 ore dall'inizio: la prenotazione va pagata comunque (spec §7).
        chargeable: actor.isAdmin && !inWindow,
      },
      include: { field: true },
    })
    await notifyBooking(tx, 'BOOKING_CANCELLED', cancelled, cancelled.field.name, actor, cancelled.cancelReason)
    return cancelled
  })
}
