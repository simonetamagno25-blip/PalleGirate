// Impostazioni del centro e campi modificabili dall'admin (spec §6, §13).
import { Prisma, type Field } from '@prisma/client'
import { z } from 'zod'
import type { Settings } from '@/lib/booking-rules'
import { BookingError, type Actor } from '@/lib/booking-service'
import { prisma } from '@/lib/db'
import { notify } from '@/lib/notifications'

function assertAdmin(actor: Actor) {
  if (!actor.isAdmin) throw new BookingError(['FORBIDDEN'])
}

const int = (min: number, max: number) => z.number().int().min(min).max(max)

const settingsSchema = z
  .object({
    openMinutes: int(0, 24 * 60),
    closeMinutes: int(0, 24 * 60),
    stepMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
    maxAdvanceDays: int(1, 365),
    maxActiveBookings: int(1, 20),
    changeWindowHours: int(0, 72),
    maxSlotsPerBooking: int(1, 4),
    membershipWarnDays: int(1, 90),
    reminderHours: int(1, 72),
  })
  .refine(
    (s) => s.openMinutes < s.closeMinutes && s.openMinutes % s.stepMinutes === 0 && s.closeMinutes % s.stepMinutes === 0,
  )

export async function updateSettings(admin: Actor, input: Settings): Promise<Settings> {
  assertAdmin(admin)
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) throw new BookingError(['INVALID_SETTINGS'])
  await prisma.settings.upsert({ where: { id: 1 }, update: parsed.data, create: { id: 1, ...parsed.data } })
  return parsed.data
}

export type FieldInput = { name: string; sport: string; slotMinutes: number; pricePerSlot: number }

const fieldSchema = z.object({
  name: z.string().trim().min(1).max(60),
  sport: z.string().trim().min(1).max(40),
  // Multipli di 15: l'occupazione si scrive a quarti d'ora.
  slotMinutes: z
    .number()
    .int()
    .min(15)
    .max(240)
    .refine((n) => n % 15 === 0),
  pricePerSlot: int(1, 1_000_000),
})

function parseField(input: FieldInput): FieldInput {
  const parsed = fieldSchema.safeParse(input)
  if (!parsed.success) throw new BookingError(['INVALID_FIELD'])
  return parsed.data
}

async function guardDuplicateName<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new BookingError(['DUPLICATE_FIELD_NAME'])
    throw e
  }
}

export async function createField(admin: Actor, input: FieldInput): Promise<Field> {
  assertAdmin(admin)
  const data = parseField(input)
  return guardDuplicateName(() => prisma.field.create({ data }))
}

export async function updateField(admin: Actor, id: string, input: FieldInput, now: Date = new Date()): Promise<Field> {
  assertAdmin(admin)
  const data = parseField(input)
  return guardDuplicateName(() =>
    prisma.$transaction(async (tx) => {
      const field = await tx.field.findUnique({ where: { id } })
      if (!field) throw new BookingError(['NOT_FOUND'])
      if (field.slotMinutes !== data.slotMinutes && (await countFuture(tx, id, now)) > 0) {
        throw new BookingError(['HAS_FUTURE_BOOKINGS'])
      }
      // Il prezzo nuovo vale solo per le prossime prenotazioni: quelle esistenti hanno `priceCents` salvato.
      return tx.field.update({ where: { id }, data })
    }),
  )
}

const countFuture = (tx: Prisma.TransactionClient, fieldId: string, now: Date) =>
  tx.booking.count({ where: { fieldId, status: 'CONFIRMED', start: { gt: now } } })

/**
 * Attiva/disattiva un campo. Disattivare con prenotazioni future richiede `cancelFuture`:
 * le cancella (motivo di sistema, occupazione liberata, notifica al socio).
 */
export async function setFieldActive(
  admin: Actor,
  id: string,
  active: boolean,
  opts: { cancelFuture?: boolean } = {},
  now: Date = new Date(),
): Promise<{ cancelled: number }> {
  assertAdmin(admin)
  return prisma.$transaction(async (tx) => {
    const field = await tx.field.findUnique({ where: { id } })
    if (!field) throw new BookingError(['NOT_FOUND'])
    let cancelled = 0
    if (!active) {
      const future = await tx.booking.findMany({ where: { fieldId: id, status: 'CONFIRMED', start: { gt: now } } })
      if (future.length > 0 && !opts.cancelFuture) throw new BookingError(['HAS_FUTURE_BOOKINGS'])
      for (const b of future) {
        await tx.occupancy.deleteMany({ where: { bookingId: b.id } })
        await tx.booking.update({
          where: { id: b.id },
          data: { status: 'CANCELLED', cancelReason: 'FIELD_DEACTIVATED', cancelledById: admin.id, chargeable: false },
        })
        await notify(tx, b.userId, 'BOOKING_CANCELLED', {
          bookingId: b.id,
          fieldName: field.name,
          start: b.start.toISOString(),
          by: 'admin',
          reason: 'FIELD_DEACTIVATED',
        })
      }
      cancelled = future.length
    }
    await tx.field.update({ where: { id }, data: { active } })
    return { cancelled }
  })
}
