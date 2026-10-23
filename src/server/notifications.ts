import type { Db, Tx } from "./db";

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
