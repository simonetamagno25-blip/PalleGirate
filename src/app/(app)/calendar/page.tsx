import { getTranslations } from "next-intl/server";
import { quarterRows } from "@/lib/calendar/grid";
import { romeDay } from "@/lib/time/rome";
import { DayGrid } from "@/components/calendar/day-grid";
import { DayPicker } from "@/components/calendar/day-picker";
import { getDayAvailability } from "@/server/availability";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

const isDay = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ day?: string; field?: string }> }) {
  const user = await requireUser();
  const t = await getTranslations("calendar");
  const sp = await searchParams;
  const day = isDay(sp.day) ? sp.day! : romeDay(new Date());
  const [availability, settings] = await Promise.all([getDayAvailability(prisma, day, { userId: user.id, isAdmin: user.isAdmin }), getSettings(prisma)]);
  const selectedField = availability.fields.find((f) => f.id === sp.field)?.id ?? availability.fields[0]?.id;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <DayPicker day={day} today={romeDay(new Date())} fields={availability.fields} selectedField={selectedField} />
      <p className="text-sm text-muted-foreground">{t("legend")}</p>
      <DayGrid availability={availability} rows={quarterRows(settings.openMinutes, settings.closeMinutes)} selectedField={selectedField} isAdmin={user.isAdmin} />
    </div>
  );
}
