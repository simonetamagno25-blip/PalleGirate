import { getFormatter, getTranslations } from "next-intl/server";
import { addDays, isValidDay, romeDay, romeMinutesOfDay } from "@/lib/time/rome";
import { CalendarBoard } from "@/components/calendar/calendar-board";
import { DayPicker } from "@/components/calendar/day-picker";
import { DayStrip } from "@/components/calendar/day-strip";
import { getDayBoard } from "@/server/availability";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const user = await requireUser();
  const t = await getTranslations("calendar");
  const td = await getTranslations("dashboard");
  const te = await getTranslations("errors");
  const format = await getFormatter();
  const sp = await searchParams;
  const now = new Date();
  const today = romeDay(now);
  const day = isValidDay(sp.day) ? sp.day : today;
  const [board, settings] = await Promise.all([getDayBoard(prisma, day, { userId: user.id, isAdmin: user.isAdmin }, now), getSettings(prisma)]);
  const days = Array.from({ length: settings.maxAdvanceDays + 1 }, (_, i) => addDays(today, i));
  const title = format.dateTime(new Date(`${day}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long" });
  const shortestSlot = Math.min(...board.rows.map((r) => r.slotMinutes));
  const closedToday = day === today && board.rows.every((r) => r.starts.length === 0) && romeMinutesOfDay(now) + shortestSlot > board.closeMinutes;
  const note = day < today ? te("IN_PAST") : closedToday ? td("closedToday") : undefined;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <div className="hidden md:block"><DayPicker day={day} today={today} /></div>
      </div>
      <DayStrip days={days} selected={day} today={today} basePath="/calendar?day=" />
      <CalendarBoard board={board} title={title} note={note} bookable={day >= today && !closedToday} />
    </div>
  );
}
