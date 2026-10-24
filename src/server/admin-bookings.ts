import type { Prisma } from "@prisma/client";
import { addDays, romeInstant } from "@/lib/time/rome";
import type { Db } from "./db";

export type BookingFilters = {
  fieldId?: string;
  memberId?: string;
  status?: "CONFIRMED" | "CANCELLED";
  payment?: "PENDING" | "PAID" | "UNPAID" | "EXEMPT";
  from?: string;
  to?: string;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ["CONFIRMED", "CANCELLED"] as const;
const PAYMENTS = ["PENDING", "PAID", "UNPAID", "EXEMPT"] as const;

export function parseBookingFilters(sp: Record<string, string | undefined>): BookingFilters {
  const f: BookingFilters = {};
  if (sp.fieldId) f.fieldId = sp.fieldId;
  if (sp.memberId) f.memberId = sp.memberId;
  if (STATUSES.includes(sp.status as never)) f.status = sp.status as BookingFilters["status"];
  if (PAYMENTS.includes(sp.payment as never)) f.payment = sp.payment as BookingFilters["payment"];
  if (sp.from && DAY.test(sp.from)) f.from = sp.from;
  if (sp.to && DAY.test(sp.to)) f.to = sp.to;
  return f;
}

// Il socio viene caricato solo con i campi di visualizzazione: mai passwordHash o sessionVersion.
export function listBookings(db: Db, f: BookingFilters, take = 300) {
  const where: Prisma.BookingWhereInput = {
    fieldId: f.fieldId,
    memberId: f.memberId,
    status: f.status,
    paymentStatus: f.payment,
    start: f.from || f.to ? { gte: f.from ? romeInstant(f.from, 0) : undefined, lt: f.to ? romeInstant(addDays(f.to, 1), 0) : undefined } : undefined,
  };
  return db.booking.findMany({
    where,
    include: { field: true, member: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { start: "desc" },
    take,
  });
}
