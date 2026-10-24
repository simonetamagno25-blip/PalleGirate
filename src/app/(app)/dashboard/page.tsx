import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { canMemberChange } from "@/lib/booking-rules";
import { daysUntilExpiry } from "@/lib/membership";
import { bookingsByMonth, hoursBySport, lastMonths } from "@/lib/stats/member";
import { Ban } from "lucide-react";
import { romeDay, romeInstant } from "@/lib/time/rome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { CancelButton } from "@/components/booking/cancel-button";
import { KpiCard } from "@/components/kpi-card";
import { Money } from "@/components/money";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { memberAccount } from "@/server/payments";
import { getSettings } from "@/server/settings";
import { LONG_DAY_TIME } from "@/lib/time/formats";

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("dashboard");
  const tb = await getTranslations("bookings");
  const ts = await getTranslations("settings");
  const format = await getFormatter();
  const now = new Date();
  const today = romeDay(now);
  const months = lastMonths(today, 6);
  const [settings, account, bookings] = await Promise.all([
    getSettings(prisma),
    memberAccount(prisma, user.id),
    prisma.booking.findMany({ where: { memberId: user.id, start: { gte: romeInstant(`${months[0]}-01`, 0) } }, include: { field: true }, orderBy: { start: "asc" } }),
  ]);
  const upcoming = bookings.filter((b) => b.status === "CONFIRMED" && b.start > now);
  const stats = bookings.map((b) => ({ ...b, sport: b.field.sport }));
  const days = user.membership ? daysUntilExpiry(user.membership.expiryDate, today) : null;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("title", { name: user.firstName })}</h1>
        <Button asChild><Link href="/book">{t("bookNow")}</Link></Button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={t("active")} value={`${upcoming.length}/${settings.maxActiveBookings}`} />
        <KpiCard
          label={t("card")}
          value={days === null ? t("noCard") : days < 0 ? t("cardExpired") : t("cardDays", { days })}
          tone={days === null || days < 0 ? "danger" : days <= settings.membershipWarningDays ? "warning" : "default"}
        />
        <KpiCard label={t("toPay")} value={<Money cents={account.debtCents} />} hint={t("strikes", { count: account.strikes })} tone={account.debtCents > 0 ? "warning" : "default"} />
        {account.blocked && <KpiCard label={t("blocked")} value={<Ban className="size-8" aria-hidden />} tone="danger" />}
      </div>
      <Card>
        <CardHeader><CardTitle>{t("next")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">{t("none")}</p>}
          {upcoming.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div className="text-sm">
                <p className="font-medium">{b.field.name}</p>
                <p className="text-muted-foreground">{format.dateTime(b.start, LONG_DAY_TIME)}</p>
              </div>
              {canMemberChange(b.start, now, settings) && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild><Link href={`/bookings/${b.id}/edit`}>{tb("edit")}</Link></Button>
                  <CancelButton bookingId={b.id} mode="member" />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartCard
          title={t("hoursBySport")}
          empty={t("noData")}
          data={hoursBySport(stats, now).map((r) => ({ sport: ts(`sports.${r.sport as "TENNIS"}`), hours: r.hours }))}
          xKey="sport"
          yKey="hours"
          valueLabel={t("hoursUnit")}
        />
        <BarChartCard
          title={t("byMonth")}
          empty={t("noData")}
          data={bookingsByMonth(stats, months).map((r) => ({ month: format.dateTime(new Date(`${r.month}-15T12:00:00Z`), { month: "short" }), count: r.count }))}
          xKey="month"
          yKey="count"
          valueLabel={t("bookingsUnit")}
          color="var(--chart-2)"
        />
      </div>
    </div>
  );
}
