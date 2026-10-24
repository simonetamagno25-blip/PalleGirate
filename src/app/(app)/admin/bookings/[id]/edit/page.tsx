import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { romeDay, romeMinutesOfDay } from "@/lib/time/rome";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { PageHeader } from "@/components/common/page-header";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { getSettings } from "@/server/settings";

export default async function AdminEditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const t = await getTranslations("wizard");
  const tn = await getTranslations("nav");
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.status !== "CONFIRMED") notFound();
  const [fields, settings] = await Promise.all([prisma.field.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }), getSettings(prisma)]);
  return (
    <div className="space-y-6">
      <PageHeader back={{ href: "/admin/bookings", label: tn("adminBookings") }} title={t("editTitle")} />
      <BookingWizard
        fields={fields}
        initial={{ fieldId: booking.fieldId, day: romeDay(booking.start), minute: romeMinutesOfDay(booking.start), slots: booking.slots }}
        minDay="2000-01-01"
        maxSlots={settings.maxSlotsPerBooking}
        mode="admin"
        bookingId={booking.id}
      />
    </div>
  );
}
