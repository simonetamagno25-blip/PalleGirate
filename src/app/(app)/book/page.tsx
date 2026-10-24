import { getTranslations } from "next-intl/server";
import { addDays, isValidDay, romeDay } from "@/lib/time/rome";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

export default async function BookPage({ searchParams }: { searchParams: Promise<{ field?: string; day?: string; time?: string }> }) {
  await requireUser();
  const t = await getTranslations("wizard");
  const sp = await searchParams;
  const [fields, settings] = await Promise.all([prisma.field.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }), getSettings(prisma)]);
  const today = romeDay(new Date());
  const minute = sp.time ? Number(sp.time) : undefined;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold md:text-3xl">{t("title")}</h1>
      <BookingWizard
        fields={fields}
        initial={{ fieldId: sp.field, day: isValidDay(sp.day) && sp.day >= today ? sp.day : today, minute: Number.isInteger(minute) ? minute : undefined }}
        minDay={today}
        maxDay={addDays(today, settings.maxAdvanceDays)}
        maxSlots={settings.maxSlotsPerBooking}
        mode="member"
      />
    </div>
  );
}
