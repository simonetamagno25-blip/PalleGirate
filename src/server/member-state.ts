import { isBlocked, type MemberState } from "@/lib/booking-rules";
import type { Db, Tx } from "./db";

export async function getMemberState(db: Db | Tx, memberId: string, now: Date, excludeBookingId?: string): Promise<MemberState> {
  const [membership, otherActiveBookings, strikeCount, unpaidCount] = await Promise.all([
    db.membership.findUnique({ where: { userId: memberId } }),
    db.booking.count({
      where: { memberId, status: "CONFIRMED", start: { gt: now }, ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}) },
    }),
    db.strike.count({ where: { memberId } }),
    db.booking.count({ where: { memberId, paymentStatus: "UNPAID" } }),
  ]);
  return { membershipExpiry: membership?.expiryDate ?? null, otherActiveBookings, blocked: isBlocked(strikeCount, unpaidCount) };
}
