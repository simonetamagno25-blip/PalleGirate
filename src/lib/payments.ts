// Pagamenti, strike, blocco e sblocco (spec §6 e §8). Tutto avviene in transazione.
import type { Booking, Prisma } from '@prisma/client'
import { isBlocked } from '@/lib/booking-rules'
import { BookingError, type Actor } from '@/lib/booking-service'
import { prisma } from '@/lib/db'
import { notify } from '@/lib/notifications'

export type PaymentOutcome = 'PAID' | 'UNPAID' | 'EXEMPT'

type Tx = Prisma.TransactionClient

function assertAdmin(actor: Actor) {
  if (!actor.isAdmin) throw new BookingError(['FORBIDDEN'])
}

async function memberStanding(tx: Tx, userId: string) {
  const [strikes, unpaid] = await Promise.all([
    tx.strike.count({ where: { userId } }),
    tx.booking.aggregate({ where: { userId, paymentStatus: 'UNPAID' }, _count: true, _sum: { priceCents: true } }),
  ])
  return { strikes, unpaidCount: unpaid._count, debtCents: unpaid._sum.priceCents ?? 0 }
}

/** Blocco: cancella le prenotazioni future CONFIRMED del socio (le in corso e le concluse non si toccano). */
async function cancelFutureBookings(tx: Tx, userId: string, now: Date): Promise<number> {
  const future = await tx.booking.findMany({
    where: { userId, status: 'CONFIRMED', start: { gt: now } },
    include: { field: true },
  })
  for (const b of future) {
    await tx.occupancy.deleteMany({ where: { bookingId: b.id } })
    await tx.booking.update({
      where: { id: b.id },
      data: { status: 'CANCELLED', cancelReason: 'AUTO_BLOCK', cancelledById: null, chargeable: false },
    })
    await notify(tx, userId, 'BOOKING_CANCELLED', {
      bookingId: b.id,
      fieldName: b.field.name,
      start: b.start.toISOString(),
      by: 'system',
      reason: 'AUTO_BLOCK',
    })
  }
  return future.length
}

/**
 * Registra l'esito di una prenotazione conclusa. Transizioni ammesse: PENDING → PAID | UNPAID | EXEMPT
 * e UNPAID → PAID | EXEMPT. L'UNPAID crea uno strike; l'EXEMPT di un UNPAID lo rimuove.
 */
export async function registerPayment(
  admin: Actor,
  bookingId: string,
  outcome: PaymentOutcome,
  now: Date = new Date(),
): Promise<Booking> {
  assertAdmin(admin)
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new BookingError(['NOT_FOUND'])
    if (booking.status !== 'CONFIRMED' && !booking.chargeable) throw new BookingError(['NOT_PAYABLE'])
    if (booking.end.getTime() > now.getTime()) throw new BookingError(['NOT_ENDED'])
    const from = booking.paymentStatus
    const allowed = from === 'PENDING' || (from === 'UNPAID' && outcome !== 'UNPAID')
    if (!allowed) throw new BookingError(['INVALID_TRANSITION'])

    const before = await memberStanding(tx, booking.userId)
    // Compare-and-set: con due richieste simultanee una sola trova ancora lo stato letto.
    const changed = await tx.booking.updateMany({
      where: { id: booking.id, paymentStatus: from },
      data: { paymentStatus: outcome },
    })
    if (changed.count === 0) throw new BookingError(['INVALID_TRANSITION'])

    if (outcome === 'UNPAID') {
      await tx.strike.create({ data: { userId: booking.userId, bookingId: booking.id } })
      const standing = await memberStanding(tx, booking.userId)
      if (standing.strikes === 1) {
        await notify(tx, booking.userId, 'STRIKE_WARNING', { bookingId: booking.id })
      } else {
        const cancelledCount = await cancelFutureBookings(tx, booking.userId, now)
        await notify(tx, booking.userId, 'ACCOUNT_BLOCKED', { bookingId: booking.id, cancelledCount, debtCents: standing.debtCents })
      }
    } else {
      if (outcome === 'EXEMPT' && from === 'UNPAID') await tx.strike.deleteMany({ where: { bookingId: booking.id } })
      const after = await memberStanding(tx, booking.userId)
      if (isBlocked(before) && !isBlocked(after)) {
        await notify(tx, booking.userId, 'ACCOUNT_UNBLOCKED', { bookingId: booking.id })
      }
    }
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id } })
  })
}

/** Il no-show è solo un dato statistico: non cambia pagamento né regole. */
export async function setNoShow(admin: Actor, bookingId: string, noShow: boolean): Promise<void> {
  assertAdmin(admin)
  const res = await prisma.booking.updateMany({ where: { id: bookingId }, data: { noShow } })
  if (res.count === 0) throw new BookingError(['NOT_FOUND'])
}

/** Prenotazioni concluse da registrare: PENDING, confermate o cancellate ma dovute, per fine crescente. */
export async function listPendingPayments(admin: Actor, now: Date = new Date()) {
  assertAdmin(admin)
  return prisma.booking.findMany({
    where: {
      paymentStatus: 'PENDING',
      end: { lte: now },
      OR: [{ status: 'CONFIRMED' }, { status: 'CANCELLED', chargeable: true }],
    },
    include: { user: true, field: true },
    orderBy: [{ end: 'asc' }, { id: 'asc' }],
  })
}

export async function getMemberLedger(
  admin: Actor,
  userId: string,
): Promise<{ strikes: number; unpaidCount: number; debtCents: number; blocked: boolean; history: Booking[] }> {
  assertAdmin(admin)
  const [standing, history] = await Promise.all([
    memberStanding(prisma, userId),
    prisma.booking.findMany({ where: { userId }, orderBy: { start: 'desc' } }),
  ])
  return { ...standing, blocked: isBlocked(standing), history }
}

/** Strike, insoluti e stato di blocco di più utenti con due sole query (per le liste dell'admin). */
export async function getStandingsByUser(
  admin: Actor,
  userIds: string[],
): Promise<Map<string, { strikes: number; unpaidCount: number; blocked: boolean }>> {
  assertAdmin(admin)
  const [strikes, unpaid] = await Promise.all([
    prisma.strike.groupBy({ by: ['userId'], where: { userId: { in: userIds } }, _count: true }),
    prisma.booking.groupBy({ by: ['userId'], where: { userId: { in: userIds }, paymentStatus: 'UNPAID' }, _count: true }),
  ])
  const strikeOf = new Map(strikes.map((r) => [r.userId, r._count]))
  const unpaidOf = new Map(unpaid.map((r) => [r.userId, r._count]))
  return new Map(
    userIds.map((id) => {
      const standing = { strikes: strikeOf.get(id) ?? 0, unpaidCount: unpaidOf.get(id) ?? 0 }
      return [id, { ...standing, blocked: isBlocked(standing) }]
    }),
  )
}
