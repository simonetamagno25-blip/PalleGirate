import { freeStarts, pastLimit } from "@/lib/calendar/free-starts";
import type { BusyInterval } from "@/lib/calendar/grid";
import { addDays, romeDay, romeInstant, romeMinutesOfDay } from "@/lib/time/rome";
import type { Db } from "./db";
import { getSettings } from "./settings";

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
      const mine = b.memberId === viewer.userId;
      const iv = toInterval(b);
      // Gli id reali delle prenotazioni altrui non escono verso i soci.
      const id = mine || viewer.isAdmin ? b.id : `${b.fieldId}:${iv.startMin}`;
      const base: DayBooking = { id, fieldId: b.fieldId, ...iv, mine };
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

export type BoardRow = DayAvailability["fields"][number] & { starts: number[]; bookings: DayBooking[] };
export type DayBoard = { day: string; openMinutes: number; closeMinutes: number; rows: BoardRow[] };

/**
 * Il tabellone di un giorno: per ogni campo attivo gli orari di inizio liberi (con le stesse regole che il wizard
 * applica a un socio: apertura, passo, slot che stanno prima della chiusura, niente orari passati) e le prenotazioni
 * del campo. Le prenotazioni passano da `getDayAvailability`, quindi un socio non vede mai chi ha prenotato.
 */
export async function getDayBoard(db: Db, day: string, viewer: Viewer, now: Date): Promise<DayBoard> {
  const [availability, settings] = await Promise.all([getDayAvailability(db, day, viewer), getSettings(db)]);
  const limit = pastLimit({ admin: false, day, today: romeDay(now), nowMinute: romeMinutesOfDay(now) });
  const rows = availability.fields.map((f) => {
    const bookings = availability.bookings.filter((b) => b.fieldId === f.id);
    const starts = limit.allowed
      ? freeStarts({ slotMinutes: f.slotMinutes, settings, busy: bookings, notBeforeMinute: limit.notBeforeMinute }).map((s) => s.minute)
      : [];
    return { ...f, starts, bookings };
  });
  return { day, openMinutes: settings.openMinutes, closeMinutes: settings.closeMinutes, rows };
}
