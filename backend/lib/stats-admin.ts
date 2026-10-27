// Dati della dashboard admin (requisiti §9.2). Periodi in giorni di calendario Europe/Rome.
import { DateTime } from 'luxon'
import { isBlocked } from '@backend/lib/booking-rules'
import { BookingError, type Actor } from '@backend/lib/booking-service'
import { prisma } from '@backend/lib/db'
import { getSettings } from '@backend/lib/settings'
import { lastTwelveMonths } from '@backend/lib/stats-member'
import { addDays, fromRome, ROME, romeDay } from '@backend/lib/time'

export type Range = 'day' | 'week' | 'month'

export const RANGES: readonly Range[] = ['day', 'week', 'month']

export type AdminDashboard = {
  range: Range
  occupancy: { fieldId: string; name: string; occupiedQuarters: number; openQuarters: number; ratio: number }[]
  revenue: { expectedCents: number; collectedCents: number; unpaidCents: number }
  noShows: number
  blockedMembers: number
  /** Solo le celle con almeno una prenotazione; `weekday` 0 = lunedì, `hour` = ora di inizio a Roma (0–23). */
  popularSlots: { weekday: number; hour: number; count: number }[]
  trend: { month: string; count: number }[]
  expiringMemberships: { userId: string; name: string; number: string; expiresAt: Date }[]
}

const DAY_MS = 86_400_000

/** Oggi, settimana corrente (lunedì–domenica) o mese corrente, a Roma: [start, end) e numero di giorni. */
function period(range: Range, now: Date) {
  const t = DateTime.fromJSDate(now, { zone: ROME })
  const start = t.startOf(range)
  const end = start.plus(range === 'day' ? { days: 1 } : range === 'week' ? { weeks: 1 } : { months: 1 })
  return { start: start.toJSDate(), end: end.toJSDate(), days: Math.round(end.diff(start, 'days').days) }
}

export async function getAdminDashboard(admin: Actor, range: Range, now: Date = new Date()): Promise<AdminDashboard> {
  if (!admin.isAdmin) throw new BookingError(['FORBIDDEN'])
  const p = period(range, now)
  const months = lastTwelveMonths(now)
  const trendStart = DateTime.fromFormat(months[0], 'yyyy-MM', { zone: ROME }).toJSDate()
  const trendEnd = DateTime.fromFormat(months[11], 'yyyy-MM', { zone: ROME }).plus({ months: 1 }).toJSDate()
  const today = romeDay(now)
  const slotsSince = new Date(now.getTime() - 90 * DAY_MS)
  const dueWhere = {
    OR: [{ status: 'CONFIRMED' as const }, { chargeable: true }],
    end: { gte: p.start, lt: p.end, lte: now },
  }

  const settings = await getSettings()
  const [fields, occupied, due, collected, unpaid, noShows, strikeGroups, recent, inTrend, expiring] = await Promise.all([
    prisma.field.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.occupancy.groupBy({ by: ['fieldId'], where: { quarterStart: { gte: p.start, lt: p.end } }, _count: true }),
    prisma.booking.aggregate({ where: { ...dueWhere, paymentStatus: { not: 'EXEMPT' } }, _sum: { priceCents: true } }),
    prisma.booking.aggregate({ where: { ...dueWhere, paymentStatus: 'PAID' }, _sum: { priceCents: true } }),
    prisma.booking.aggregate({ where: { paymentStatus: 'UNPAID' }, _sum: { priceCents: true } }),
    prisma.booking.count({ where: { noShow: true, start: { gte: p.start, lt: p.end } } }),
    prisma.strike.groupBy({ by: ['userId'], _count: true }),
    prisma.booking.findMany({
      where: { status: 'CONFIRMED', start: { gte: slotsSince, lte: now } },
      select: { start: true },
    }),
    prisma.booking.findMany({
      where: { status: 'CONFIRMED', start: { gte: trendStart, lt: trendEnd } },
      select: { start: true },
    }),
    prisma.membership.findMany({
      where: {
        expiresAt: { gte: fromRome(today, '00:00'), lt: fromRome(addDays(today, settings.membershipWarnDays + 1), '00:00') },
      },
      include: { user: true },
      orderBy: { expiresAt: 'asc' },
    }),
  ])

  const occupiedOf = new Map(occupied.map((r) => [r.fieldId, r._count]))
  const openQuarters = p.days * Math.floor((settings.closeMinutes - settings.openMinutes) / 15)

  const withStrikes = strikeGroups.filter((g) => g._count >= 2)
  const unpaidByUser = await prisma.booking.groupBy({
    by: ['userId'],
    where: { userId: { in: withStrikes.map((g) => g.userId) }, paymentStatus: 'UNPAID' },
    _count: true,
  })
  const unpaidOf = new Map(unpaidByUser.map((g) => [g.userId, g._count]))
  const blockedMembers = withStrikes.filter((g) => isBlocked({ strikes: g._count, unpaidCount: unpaidOf.get(g.userId) ?? 0 })).length

  const cells = new Map<string, { weekday: number; hour: number; count: number }>()
  for (const b of recent) {
    const t = DateTime.fromJSDate(b.start, { zone: ROME })
    const key = `${t.weekday - 1}-${t.hour}`
    const cell = cells.get(key) ?? { weekday: t.weekday - 1, hour: t.hour, count: 0 }
    cell.count++
    cells.set(key, cell)
  }

  const perMonth = new Map(months.map((m) => [m, 0]))
  for (const b of inTrend) {
    const key = romeDay(b.start).slice(0, 7)
    perMonth.set(key, (perMonth.get(key) ?? 0) + 1)
  }

  return {
    range,
    occupancy: fields.map((f) => {
      const occupiedQuarters = occupiedOf.get(f.id) ?? 0
      return {
        fieldId: f.id,
        name: f.name,
        occupiedQuarters,
        openQuarters,
        ratio: openQuarters > 0 ? occupiedQuarters / openQuarters : 0,
      }
    }),
    revenue: {
      expectedCents: due._sum.priceCents ?? 0,
      collectedCents: collected._sum.priceCents ?? 0,
      unpaidCents: unpaid._sum.priceCents ?? 0,
    },
    noShows,
    blockedMembers,
    popularSlots: [...cells.values()].sort((a, b) => a.weekday - b.weekday || a.hour - b.hour),
    trend: months.map((month) => ({ month, count: perMonth.get(month) ?? 0 })),
    expiringMemberships: expiring.map((m) => ({
      userId: m.userId,
      name: `${m.user.lastName} ${m.user.firstName}`,
      number: m.number,
      expiresAt: m.expiresAt,
    })),
  }
}
