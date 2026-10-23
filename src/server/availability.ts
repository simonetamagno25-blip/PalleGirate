import type { BusyInterval } from "@/lib/calendar/grid";
import { addDays, romeInstant, romeMinutesOfDay } from "@/lib/time/rome";
import type { Db } from "./db";

export type Viewer = { userId: string; isAdmin: boolean };
export type DayBooking = { id: string; fieldId: string; startMin: number; endMin: number; mine: boolean; memberName?: string };
export type DayAvailability = {
  day: string;
  fields: { id: string; name: string; sport: string; slotMinutes: number; priceCents: number }[];
  bookings: DayBooking[];
};

const dayRange = (day: string) => ({ gte: romeInstant(day, 0), lt: romeInstant(addDays(day, 1), 0) });
// Le prenotazioni finiscono entro le 23:00, quindi la fine cade sempre nello stesso giorno.
// Una prenotazione che finisce a mezzanotte ha endMin 0: la trattiamo come fine giornata (1440).
const toInterval = (b: { start: Date; end: Date }): BusyInterval => {
  const startMin = romeMinutesOfDay(b.start);
  const end = romeMinutesOfDay(b.end);
  return { startMin, endMin: end <= startMin ? 1440 : end };
};

export async function getDayAvailability(db: Db, day: string, viewer: Viewer): Promise<DayAvailability> {
  const [fields, bookings] = await Promise.all([
    db.field.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.booking.findMany({
      where: { status: "CONFIRMED", start: dayRange(day) },
      include: viewer.isAdmin ? { member: { select: { firstName: true, lastName: true } } } : undefined,
      orderBy: { start: "asc" },
    }),
  ]);
  return {
    day,
    fields: fields.map(({ id, name, sport, slotMinutes, priceCents }) => ({ id, name, sport, slotMinutes, priceCents })),
    bookings: bookings.map((b) => {
      const base: DayBooking = { id: b.id, fieldId: b.fieldId, ...toInterval(b), mine: b.memberId === viewer.userId };
      if (viewer.isAdmin && "member" in b) {
        const m = b.member as { firstName: string; lastName: string };
        base.memberName = `${m.firstName} ${m.lastName}`;
      }
      return base;
    }),
  };
}

export async function busyForField(db: Db, fieldId: string, day: string, excludeBookingId?: string): Promise<BusyInterval[]> {
  const rows = await db.booking.findMany({
    where: { fieldId, status: "CONFIRMED", start: dayRange(day), ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}) },
    select: { start: true, end: true },
  });
  return rows.map(toInterval);
}
