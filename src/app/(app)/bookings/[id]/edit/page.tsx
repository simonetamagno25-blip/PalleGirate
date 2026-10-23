import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { addDays, romeDay, romeMinutesOfDay } from "@/lib/time/rome";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

export default async function EditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const t = await getTranslations("wizard");
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.memberId !== user.id || booking.status !== "CONFIRMED") notFound();
  const [fields, settings] = await Promise.all([prisma.field.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }), getSettings(prisma)]);
  const today = romeDay(new Date());
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("editTitle")}</h1>
      <BookingWizard
        fields={fields}
        initial={{ fieldId: booking.fieldId, day: romeDay(booking.start), minute: romeMinutesOfDay(booking.start), slots: booking.slots }}
        minDay={today}
        maxDay={addDays(today, settings.maxAdvanceDays)}
        maxSlots={settings.maxSlotsPerBooking}
        mode="member"
        bookingId={booking.id}
      />
    </div>
  );
}
