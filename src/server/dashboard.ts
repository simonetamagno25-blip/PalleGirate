import { isBlocked } from "@/lib/booking-rules";
import { occupancyByField, rangeBounds, revenueSummary, hourHistogram, type Range } from "@/lib/stats/admin";
import { bookingsByMonth, lastMonths } from "@/lib/stats/member";
import { addDays, romeDay, romeInstant } from "@/lib/time/rome";
import type { Db } from "./db";
import { getSettings } from "./settings";

export async function loadAdminDashboard(db: Db, range: Range, now = new Date()) {
  const today = romeDay(now);
  const { from, to } = rangeBounds(range, today);
  const months = lastMonths(today, 12);
  const [settings, fields, periodBookings, yearBookings, strikes, unpaid, expiring] = await Promise.all([
    getSettings(db),
    db.field.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.booking.findMany({ where: { start: { gte: romeInstant(from, 0), lt: romeInstant(to, 0) } }, include: { field: true } }),
    db.booking.findMany({ where: { start: { gte: romeInstant(`${months[0]}-01`, 0) } }, include: { field: true } }),
    db.strike.groupBy({ by: ["memberId"], _count: { _all: true } }),
    db.booking.groupBy({ by: ["memberId"], where: { paymentStatus: "UNPAID" }, _count: { _all: true } }),
    db.membership.findMany({
      where: { expiryDate: { gte: today, lte: addDays(today, 30) } },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { expiryDate: "asc" },
    }),
  ]);
  const toStat = (b: (typeof periodBookings)[number]) => ({ ...b, sport: b.field.sport });
  const period = periodBookings.map(toStat);
  const year = yearBookings.map(toStat);
  const unpaidBy = new Map(unpaid.map((u) => [u.memberId, u._count._all]));
  const blockedMembers = strikes.filter((s) => isBlocked(s._count._all, unpaidBy.get(s.memberId) ?? 0)).length;
  return {
    range, from, to,
    occupancy: occupancyByField(period, fields, from, to, settings.openMinutes, settings.closeMinutes),
    revenue: revenueSummary(year, now),
    noShows: period.filter((b) => b.noShow).length,
    blockedMembers,
    heatmap: hourHistogram(year),
    trend: bookingsByMonth(year, months),
    expiring: expiring.map((m) => ({ userId: m.user.id, name: `${m.user.lastName} ${m.user.firstName}`, expiryDate: m.expiryDate })),
    openHours: { from: Math.floor(settings.openMinutes / 60), to: Math.ceil(settings.closeMinutes / 60) },
  };
}
