import { Prisma } from "@prisma/client";
import { daysUntilExpiry } from "@/lib/membership";
import { romeDay } from "@/lib/time/rome";
import type { Db, Tx } from "./db";
import { getSettings } from "./settings";

export type NotificationType =
  | "BOOKING_CREATED"
  | "BOOKING_UPDATED"
  | "BOOKING_CANCELLED"
  | "BOOKING_CANCELLED_BLOCK"
  | "STRIKE_WARNING"
  | "ACCOUNT_BLOCKED"
  | "ACCOUNT_UNBLOCKED"
  | "BOOKING_REMINDER"
  | "MEMBERSHIP_EXPIRING"
  | "MEMBERSHIP_EXPIRED";

export type NotificationParams = Record<string, string | number>;

/** Il testo non si salva: si salvano tipo e parametri, tradotti quando l'utente li legge. */
export async function notify(db: Db | Tx, userId: string, type: NotificationType, params: NotificationParams = {}, dedupeKey?: string) {
  const data = { userId, type, params: JSON.stringify(params), dedupeKey };
  if (dedupeKey) {
    await db.notification.upsert({ where: { userId_dedupeKey: { userId, dedupeKey } }, update: {}, create: data });
  } else {
    await db.notification.create({ data });
  }
}

/**
 * Le notifiche temporali vengono generate in modo pigro quando l'utente apre una pagina:
 * in locale non c'è un cron. Le chiavi di deduplica le rendono idempotenti.
 */
export async function ensureTimedNotifications(db: Db, userId: string, now = new Date()) {
  // Due render concorrenti possono tentare lo stesso upsert di deduplica: P2002 significa "già creata", si ignora.
  const notifyOnce = async (...args: Parameters<typeof notify>) => {
    try {
      await notify(...args);
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  };
  const [settings, membership] = await Promise.all([getSettings(db), db.membership.findUnique({ where: { userId } })]);
  const reminders = await db.booking.findMany({
    where: { memberId: userId, status: "CONFIRMED", start: { gt: now, lte: new Date(now.getTime() + settings.reminderHours * 3_600_000) } },
    include: { field: true },
  });
  for (const b of reminders) {
    const start = b.start.toISOString();
    await notifyOnce(db, userId, "BOOKING_REMINDER", { field: b.field.name, start }, `reminder:${b.id}:${start}`);
  }
  if (membership) {
    const days = daysUntilExpiry(membership.expiryDate, romeDay(now));
    if (days < 0) {
      await notifyOnce(db, userId, "MEMBERSHIP_EXPIRED", { expiry: membership.expiryDate }, `expired:${membership.expiryDate}`);
    } else if (days <= settings.membershipWarningDays) {
      await notifyOnce(db, userId, "MEMBERSHIP_EXPIRING", { expiry: membership.expiryDate, days }, `expiring:${membership.expiryDate}`);
    }
  }
}

export const unreadCount = (db: Db, userId: string) => db.notification.count({ where: { userId, read: false } });

export const listNotifications = (db: Db, userId: string, take = 50) =>
  db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });

export async function markRead(db: Db, userId: string, id: string) {
  await db.notification.updateMany({ where: { id, userId }, data: { read: true } });
}

export async function markAllRead(db: Db, userId: string) {
  await db.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}
