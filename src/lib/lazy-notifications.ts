// Notifiche temporali "pigre" (spec §9): niente cron, si generano quando l'utente carica una pagina.
// Sono idempotenti grazie a `dedupeKey` (una sola per utente ed evento), anche con richieste simultanee.
import { prisma } from '@/lib/db'
import { notify } from '@/lib/notifications'
import { getSettings } from '@/lib/settings'
import { daysBetween, romeDay } from '@/lib/time'

const HOUR = 3_600_000

async function bookingReminders(userId: string, now: Date, reminderHours: number) {
  const upcoming = await prisma.booking.findMany({
    where: {
      userId,
      status: 'CONFIRMED',
      start: { gt: now, lte: new Date(now.getTime() + reminderHours * HOUR) },
    },
    include: { field: true },
  })
  for (const b of upcoming) {
    // La chiave include l'inizio: se la prenotazione viene spostata, il promemoria si rigenera.
    await notify(
      prisma,
      userId,
      'BOOKING_REMINDER',
      { bookingId: b.id, fieldName: b.field.name, start: b.start.toISOString(), by: 'system', reason: null },
      `reminder:${b.id}:${b.start.toISOString()}`,
    )
  }
}

async function membershipNotices(userId: string, now: Date, warnDays: number) {
  const membership = await prisma.membership.findUnique({ where: { userId } })
  if (!membership) return
  const expiresOn = romeDay(membership.expiresAt)
  const daysLeft = daysBetween(romeDay(now), expiresOn)
  if (daysLeft < 0) {
    await notify(prisma, userId, 'MEMBERSHIP_EXPIRED', { expiresOn }, `membership-expired:${expiresOn}`)
  } else if (daysLeft <= warnDays) {
    await notify(prisma, userId, 'MEMBERSHIP_EXPIRING', { expiresOn, daysLeft }, `membership-expiring:${expiresOn}`)
  }
}

/** Genera le notifiche temporali dovute all'utente. Non lancia mai: non deve rompere la pagina che la chiama. */
export async function runLazyNotifications(userId: string, now: Date = new Date()): Promise<void> {
  try {
    const settings = await getSettings()
    await bookingReminders(userId, now, settings.reminderHours)
    await membershipNotices(userId, now, settings.membershipWarnDays)
  } catch (e) {
    console.error('runLazyNotifications', e)
  }
}
