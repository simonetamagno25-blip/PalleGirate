// Dati della dashboard del socio (spec §9 / requisiti §9.1). Riguardano solo l'utente indicato.
import type { Booking, Field } from '@prisma/client'
import { DateTime } from 'luxon'
import { isBlocked } from '@/lib/booking-rules'
import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { daysBetween, ROME, romeDay } from '@/lib/time'

export type MemberDashboard = {
  upcoming: (Booking & { field: Field })[]
  activeCount: number
  maxActive: number
  membership: { number: string; expiresAt: Date; daysLeft: number } | null
  debtCents: number
  strikes: number
  blocked: boolean
  hoursBySport: { sport: string; hours: number }[]
  bookingsByMonth: { month: string; count: number }[]
}

/** I 12 mesi di calendario (Roma) che finiscono con quello di `now`, come 'YYYY-MM', dal più vecchio. */
export function lastTwelveMonths(now: Date): string[] {
  const current = DateTime.fromJSDate(now, { zone: ROME }).startOf('month')
  return Array.from({ length: 12 }, (_, i) => current.minus({ months: 11 - i }).toFormat('yyyy-MM'))
}

export async function getMemberDashboard(userId: string, now: Date = new Date()): Promise<MemberDashboard> {
  const months = lastTwelveMonths(now)
  const windowStart = DateTime.fromFormat(months[0], 'yyyy-MM', { zone: ROME }).toJSDate()
  const windowEnd = DateTime.fromFormat(months[11], 'yyyy-MM', { zone: ROME }).plus({ months: 1 }).toJSDate()

  const [settings, membership, upcoming, activeCount, strikes, unpaid, played, inWindow] = await Promise.all([
    getSettings(),
    prisma.membership.findUnique({ where: { userId } }),
    prisma.booking.findMany({
      where: { userId, status: 'CONFIRMED', start: { gt: now } },
      include: { field: true },
      orderBy: { start: 'asc' },
      take: 5,
    }),
    prisma.booking.count({ where: { userId, status: 'CONFIRMED', start: { gt: now } } }),
    prisma.strike.count({ where: { userId } }),
    prisma.booking.aggregate({ where: { userId, paymentStatus: 'UNPAID' }, _count: true, _sum: { priceCents: true } }),
    prisma.booking.findMany({
      where: { userId, status: 'CONFIRMED', noShow: false, end: { lte: now } },
      select: { start: true, end: true, field: { select: { sport: true } } },
    }),
    prisma.booking.findMany({
      where: { userId, status: 'CONFIRMED', start: { gte: windowStart, lt: windowEnd } },
      select: { start: true },
    }),
  ])

  const minutesBySport = new Map<string, number>()
  for (const b of played) {
    const minutes = (b.end.getTime() - b.start.getTime()) / 60_000
    minutesBySport.set(b.field.sport, (minutesBySport.get(b.field.sport) ?? 0) + minutes)
  }
  const perMonth = new Map(months.map((m) => [m, 0]))
  for (const b of inWindow) {
    const key = romeDay(b.start).slice(0, 7)
    perMonth.set(key, (perMonth.get(key) ?? 0) + 1)
  }

  const standing = { strikes, unpaidCount: unpaid._count }
  return {
    upcoming,
    activeCount,
    maxActive: settings.maxActiveBookings,
    membership: membership
      ? {
          number: membership.number,
          expiresAt: membership.expiresAt,
          daysLeft: daysBetween(romeDay(now), romeDay(membership.expiresAt)),
        }
      : null,
    debtCents: unpaid._sum.priceCents ?? 0,
    strikes,
    blocked: isBlocked(standing),
    hoursBySport: [...minutesBySport]
      .map(([sport, minutes]) => ({ sport, hours: minutes / 60 }))
      .sort((a, b) => b.hours - a.hours),
    bookingsByMonth: months.map((month) => ({ month, count: perMonth.get(month) ?? 0 })),
  }
}
