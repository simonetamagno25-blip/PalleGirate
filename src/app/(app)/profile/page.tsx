import { getFormatter, getTranslations } from "next-intl/server";
import { daysUntilExpiry } from "@/lib/membership";
import { bookingsByMonth, hoursBySport, lastMonths } from "@/lib/stats/member";
import { romeDay, romeInstant } from "@/lib/time/rome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { StatusLamp } from "@/components/common/status-lamp";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";

export default async function ProfilePage() {
  const user = await requireUser();
  const t = await getTranslations("profile");
  const tm = await getTranslations("members");
  const format = await getFormatter();
  const m = user.membership;
  const date = (d: string) => format.dateTime(new Date(`${d}T12:00:00Z`), { dateStyle: "long" });
  const now = new Date();
  const today = romeDay(now);
  const days = m ? daysUntilExpiry(m.expiryDate, today) : null;
  // The member's own numbers (moved here from home): last six months of bookings.
  const td = await getTranslations("dashboard");
  const ts = await getTranslations("settings");
  const months = lastMonths(today, 6);
  const bookings = await prisma.booking.findMany({ where: { memberId: user.id, start: { gte: romeInstant(`${months[0]}-01`, 0) } }, include: { field: true } });
  const stats = bookings.map((b) => ({ ...b, sport: b.field.sport }));
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="font-display text-2xl font-bold md:text-3xl">{t("title")}</h1>
      <Card>
        <CardHeader><CardTitle>{t("card")}</CardTitle></CardHeader>
        <CardContent>
          {!m && <StatusLamp tone="red">{t("noCard")}</StatusLamp>}
          {m && (
            <dl className="divide-y">
              <Row label={t("number")}><span className="font-display text-xl font-bold tracking-[0.04em]">{m.number}</span></Row>
              {days !== null && days >= 0 && (
                <Row label={tm("expiryDate")}>
                  <span className="block">{t("expires", { date: date(m.expiryDate) })}</span>
                  <span className="block font-normal text-muted-foreground">{t("daysLeft", { days })}</span>
                </Row>
              )}
              {days !== null && days < 0 && (
                <Row label={tm("expiryDate")}><StatusLamp tone="red">{t("expired", { date: date(m.expiryDate) })}</StatusLamp></Row>
              )}
            </dl>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("data")}</CardTitle></CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row label={tm("firstName")}>{user.firstName}</Row>
            <Row label={tm("lastName")}>{user.lastName}</Row>
            <Row label={tm("email")}><span className="break-all">{user.email}</span></Row>
            {user.phone && <Row label={tm("phone")}>{user.phone}</Row>}
            {user.birthDate && <Row label={tm("birthDate")}>{date(user.birthDate)}</Row>}
          </dl>
        </CardContent>
      </Card>
      <section aria-labelledby="my-numbers" className="space-y-3 pt-2">
        <h2 id="my-numbers" className="text-xl font-semibold">{t("numbers")}</h2>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-2">
          <BarChartCard
            title={td("hoursBySport")}
            empty={td("noData")}
            data={hoursBySport(stats, now).map((r) => ({ sport: ts(`sports.${r.sport as "TENNIS"}`), hours: r.hours }))}
            xKey="sport"
            yKey="hours"
            valueLabel={td("hoursUnit")}
          />
          <BarChartCard
            title={td("byMonth")}
            empty={td("noData")}
            data={bookingsByMonth(stats, months).map((r) => ({ month: format.dateTime(new Date(`${r.month}-15T12:00:00Z`), { month: "short" }), count: r.count }))}
            xKey="month"
            yKey="count"
            valueLabel={td("bookingsUnit")}
          />
        </div>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 py-3 first:pt-0 last:pb-0 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-[0.9375rem] text-muted-foreground">{label}</dt>
      <dd className="text-base font-medium">{children}</dd>
    </div>
  );
}
