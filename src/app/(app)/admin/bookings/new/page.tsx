import { getTranslations } from "next-intl/server";
import { romeDay } from "@/lib/time/rome";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { PageHeader } from "@/components/common/page-header";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { getSettings } from "@/server/settings";

export default async function AdminNewBookingPage({ searchParams }: { searchParams: Promise<{ memberId?: string }> }) {
  await requireAdmin();
  const t = await getTranslations("adminBookings");
  const tn = await getTranslations("nav");
  const { memberId } = await searchParams;
  const [fields, settings, users] = await Promise.all([
    prisma.field.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getSettings(prisma),
    prisma.user.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }], select: { id: true, firstName: true, lastName: true } }),
  ]);
  const members = users.map((u) => ({ id: u.id, name: `${u.lastName} ${u.firstName}` }));
  // Il socio passato nell'URL va in cima alla lista, così è già selezionato.
  members.sort((a, b) => Number(b.id === memberId) - Number(a.id === memberId));
  return (
    <div className="space-y-6">
      <PageHeader back={{ href: "/admin/bookings", label: tn("adminBookings") }} title={t("new")} />
      {/* Admin: nessun limite di anticipo, quindi niente minDay/maxDay restrittivi oltre a oggi come default. */}
      <BookingWizard fields={fields} initial={{ day: romeDay(new Date()) }} minDay="2000-01-01" maxSlots={settings.maxSlotsPerBooking} mode="admin" members={members} />
    </div>
  );
}
