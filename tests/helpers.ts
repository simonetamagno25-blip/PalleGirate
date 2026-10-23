import { prisma } from '@/lib/db'
import { fromRome } from '@/lib/time'

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
