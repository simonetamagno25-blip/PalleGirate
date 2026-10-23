// Elenchi di prenotazioni per le pagine "le mie prenotazioni" e per l'area admin.
import type { Prisma } from '@prisma/client'
import type { Actor } from '@/lib/booking-service'
import { prisma } from '@/lib/db'
import { addDays, fromRome } from '@/lib/time'

const HISTORY_LIMIT = 50
const ADMIN_LIMIT = 200

/** Prossime prenotazioni (confermate, future, in ordine cronologico) e storico (passate o cancellate). */
export async function listMemberBookings(userId: string, now: Date = new Date()) {
  const [upcoming, history] = await Promise.all([
    prisma.booking.findMany({
      where: { userId, status: 'CONFIRMED', start: { gt: now } },
      include: { field: true },
      orderBy: { start: 'asc' },
    }),
    prisma.booking.findMany({
      where: { userId, OR: [{ status: 'CANCELLED' }, { start: { lte: now } }] },
      include: { field: true },
      orderBy: { start: 'desc' },
      take: HISTORY_LIMIT,
    }),
  ])
  return { upcoming, history }
}

export type BookingFilters = { fieldId?: string; day?: string; q?: string }

/** Tutte le prenotazioni, con socio e campo, filtrabili per campo, giorno e socio (solo admin). */
export async function listAllBookings(admin: Actor, filters: BookingFilters) {
  if (!admin.isAdmin) throw new Error('FORBIDDEN')
  const q = filters.q?.trim()
  const where: Prisma.BookingWhereInput = {
    ...(filters.fieldId ? { fieldId: filters.fieldId } : {}),
    ...(filters.day ? { start: { gte: fromRome(filters.day, '00:00'), lt: fromRome(addDays(filters.day, 1), '00:00') } } : {}),
    ...(q
      ? {
          user: {
            OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q } }],
          },
        }
      : {}),
  }
  return prisma.booking.findMany({
    where,
    include: { field: true, user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    orderBy: { start: 'desc' },
    take: ADMIN_LIMIT,
  })
}
