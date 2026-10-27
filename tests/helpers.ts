import type { PaymentStatus } from '@prisma/client'
import { quarterStarts } from '@backend/lib/booking-rules'
import { prisma } from '@backend/lib/db'
import { fromRome } from '@backend/lib/time'

export const NOW = fromRome('2026-10-13', '12:00')

export async function resetDb() {
  await prisma.occupancy.deleteMany()
  await prisma.strike.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.membershipRenewal.deleteMany()
  await prisma.membership.deleteMany()
  await prisma.user.deleteMany()
  await prisma.field.deleteMany()
  await prisma.settings.deleteMany()
}

let counter = 0

export async function makeMember(over: { expiresAt?: Date | null; isAdmin?: boolean; email?: string } = {}) {
  counter++
  const expiresAt = over.expiresAt === undefined ? fromRome('2027-06-30', '12:00') : over.expiresAt
  return prisma.user.create({
    data: {
      firstName: `Nome${counter}`,
      lastName: `Cognome${counter}`,
      email: over.email ?? `socio${counter}@example.com`,
      isAdmin: over.isAdmin ?? false,
      ...(expiresAt
        ? {
            membership: {
              create: { number: `T${String(counter).padStart(4, '0')}`, issuedAt: fromRome('2026-01-01', '12:00'), expiresAt },
            },
          }
        : {}),
    },
  })
}

export function makeField(over: { name?: string; slotMinutes?: number; pricePerSlot?: number; active?: boolean } = {}) {
  counter++
  return prisma.field.create({
    data: {
      name: over.name ?? `Campo ${counter}`,
      sport: 'tennis',
      slotMinutes: over.slotMinutes ?? 60,
      pricePerSlot: over.pricePerSlot ?? 1800,
      active: over.active ?? true,
    },
  })
}

export async function makeBooking(over: {
  userId: string
  fieldId: string
  start: Date
  slots?: number
  status?: 'CONFIRMED' | 'CANCELLED'
  paymentStatus?: PaymentStatus
  chargeable?: boolean
}) {
  const field = await prisma.field.findUniqueOrThrow({ where: { id: over.fieldId } })
  const slots = over.slots ?? 1
  const end = new Date(over.start.getTime() + slots * field.slotMinutes * 60_000)
  const status = over.status ?? 'CONFIRMED'
  const booking = await prisma.booking.create({
    data: {
      userId: over.userId,
      fieldId: over.fieldId,
      start: over.start,
      end,
      slots,
      priceCents: slots * field.pricePerSlot,
      status,
      paymentStatus: over.paymentStatus ?? 'PENDING',
      chargeable: over.chargeable ?? false,
    },
  })
  if (status === 'CONFIRMED') {
    await prisma.occupancy.createMany({
      data: quarterStarts(over.start, end).map((quarterStart) => ({ bookingId: booking.id, fieldId: field.id, quarterStart })),
    })
  }
  return booking
}
