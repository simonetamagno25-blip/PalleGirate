// Notifiche interne (spec §9). Il testo non si salva: si salvano tipo e parametri e si traduce alla visualizzazione.
import { Prisma, type Notification, type PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'

export const NOTIFICATION_TYPES = [
  'BOOKING_CREATED',
  'BOOKING_UPDATED',
  'BOOKING_CANCELLED',
  'STRIKE_WARNING',
  'ACCOUNT_BLOCKED',
  'ACCOUNT_UNBLOCKED',
  'BOOKING_REMINDER',
  'MEMBERSHIP_EXPIRING',
  'MEMBERSHIP_EXPIRED',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export type NotifyParams = Record<string, string | number | boolean | null>

/**
 * Crea una notifica. Con `dedupeKey` ne esiste al massimo una per (utente, chiave): se c'è già ritorna `false`.
 * Con `dedupeKey` va chiamata fuori da una transazione (in PostgreSQL un errore ne interrompe la corsa).
 */
export async function notify(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  type: NotificationType,
  params: NotifyParams,
  dedupeKey?: string,
): Promise<boolean> {
  try {
    await db.notification.create({
      data: { userId, type, params: JSON.stringify(params), dedupeKey: dedupeKey ?? null },
    })
    return true
  } catch (e) {
    if (dedupeKey && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return false
    throw e
  }
}

export function listNotifications(userId: string, limit = 50): Promise<Notification[]> {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
  })
}

export function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } })
}

/** Segna come letta solo se appartiene all'utente: l'id di un altro non ha effetto. */
export async function markRead(userId: string, id: string): Promise<void> {
  await prisma.notification.updateMany({ where: { id, userId }, data: { read: true } })
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
}
