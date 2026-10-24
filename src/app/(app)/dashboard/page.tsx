import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { CirclePlus } from "lucide-react";
import { canMemberChange } from "@/lib/booking-rules";
import { daysUntilExpiry } from "@/lib/membership";
import { bookingsByMonth, hoursBySport, lastMonths } from "@/lib/stats/member";
import { addDays, minutesToHHMM, romeDay, romeInstant, romeMinutesOfDay } from "@/lib/time/rome";
import { SHORT_DAY_TIME, TIME_ONLY } from "@/lib/time/formats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Board, boardButton } from "@/components/board/board";
import { DeparturesBoard } from "@/components/board/departures-board";
import { SplitFlap } from "@/components/board/split-flap";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { CancelButton } from "@/components/booking/cancel-button";
import { Money } from "@/components/common/money";
import { StatusLamp } from "@/components/common/status-lamp";
import { getDayBoard } from "@/server/availability";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { memberAccount } from "@/server/payments";
import { getSettings } from "@/server/settings";

const LONG_DAY = { weekday: "long", day: "numeric", month: "long" } as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("dashboard");
  const tb = await getTranslations("bookings");
  const ts = await getTranslations("settings");
  const format = await getFormatter();
  const now = new Date();
  const today = romeDay(now);
  const months = lastMonths(today, 6);
  const [settings, account, bookings, board] = await Promise.all([
    getSettings(prisma),
    memberAccount(prisma, user.id),
    prisma.booking.findMany({ where: { memberId: user.id, start: { gte: romeInstant(`${months[0]}-01`, 0) } }, include: { field: true }, orderBy: { start: "asc" } }),
    // The home board is always the member view: no names, even for an admin.
    getDayBoard(prisma, today, { userId: user.id, isAdmin: false }, now),
  ]);
  const upcoming = bookings.filter((b) => b.status === "CONFIRMED" && b.start > now);
  const [next, ...later] = upcoming;
  const stats = bookings.map((b) => ({ ...b, sport: b.field.sport }));
  const days = user.membership ? daysUntilExpiry(user.membership.expiryDate, today) : null;

  const dayWords = (d: Date) => {
    const date = format.dateTime(d, LONG_DAY);
    const day = romeDay(d);
    return day === today ? t("dayToday", { date }) : day === addDays(today, 1) ? t("dayTomorrow", { date }) : date;
  };
  const hhmm = (d: Date) => minutesToHHMM(romeMinutesOfDay(d));
  const deadline = next ? new Date(next.start.getTime() - settings.changeWindowMinutes * 60_000) : null;
  const deadlineText = next && deadline ? format.dateTime(deadline, romeDay(deadline) === romeDay(next.start) ? TIME_ONLY : SHORT_DAY_TIME) : "";
  const changeable = next ? canMemberChange(next.start, now, settings) : false;
  const activeCount = upcoming.length + "/" + settings.maxActiveBookings;

  const bookCta = (
    <Button asChild size="lg" className="h-[3.75rem] w-full text-xl">
      <Link href="/book"><CirclePlus className="size-6" aria-hidden /> {t("bookNow")}</Link>
    </Button>
  );

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold md:text-3xl">{t("title", { name: user.firstName })}</h1>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-4">
          {/* (a) Next game: the one big flap time on the page. */}
          <Board id="next-game" title={t("nextGame")}>
            {next ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <SplitFlap value={hhmm(next.start)} size="lg" label={format.dateTime(next.start, TIME_ONLY)} />
                  <p className="pt-1 font-display text-2xl leading-tight font-bold tracking-[0.03em] uppercase">{next.field.name}</p>
                  <p className="text-lg text-flap-ink">{dayWords(next.start)}</p>
                  <p className="text-base text-flap-ink-muted">{t("until", { time: hhmm(next.end) })}</p>
                </div>
                <div className="border-t border-flap-seam pt-3">
                  {changeable ? (
                    <StatusLamp tone="amber" onBoard className="text-base text-flap-ink">{t("editableUntil", { time: deadlineText })}</StatusLamp>
                  ) : (
                    <StatusLamp tone="neutral" onBoard className="text-base text-flap-ink-muted">{t("locked")}</StatusLamp>
                  )}
                </div>
                {changeable && (
                  <div className="flex items-center gap-3">
                    <Button asChild variant="outline" className={boardButton}><Link href={`/bookings/${next.id}/edit`}>{tb("edit")}</Link></Button>
                    <CancelButton bookingId={next.id} mode="member" onBoard size="default" className="ml-auto" />
                  </div>
                )}
                {later.length > 0 && (
                  <div className="border-t border-flap-seam pt-3">
                    <h3 className="pb-1 text-base font-semibold text-flap-ink-muted">{t("later")}</h3>
                    <ul>
                      {later.map((b) => (
                        <li key={b.id} className="flex items-center gap-3 border-t border-flap-seam py-2 first:border-t-0">
                          <SplitFlap value={hhmm(b.start)} size="sm" />
                          <span className="min-w-0">
                            <span className="block font-display text-lg leading-tight font-bold tracking-[0.03em] uppercase">{b.field.name}</span>
                            <span className="block text-[0.9375rem] text-flap-ink-muted">{dayWords(b.start)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="font-display text-2xl leading-tight font-bold">{t("noGame")}</p>
                <p className="text-base text-flap-ink-muted">{t("noGameHint")}</p>
                {bookCta}
              </div>
            )}
          </Board>

          {/* (b) The primary action, one tap away. */}
          {next && bookCta}
        </div>

        {/* (c) Today's departures. */}
        <DeparturesBoard board={board} nowMinute={romeMinutesOfDay(now)} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* (d) Account summary as a definition list, not hero metrics. */}
        <Card>
          <CardHeader><CardTitle>{t("account")}</CardTitle></CardHeader>
          <CardContent>
            <dl className="divide-y">
              <SummaryRow label={t("active")}>{activeCount}</SummaryRow>
              <SummaryRow label={t("card")}>
                {days === null ? (
                  <StatusLamp tone="red">{t("noCard")}</StatusLamp>
                ) : days < 0 ? (
                  <StatusLamp tone="red">{t("cardExpired")}</StatusLamp>
                ) : days <= settings.membershipWarningDays ? (
                  <StatusLamp tone="amber">{t("cardDays", { days })}</StatusLamp>
                ) : (
                  t("cardDays", { days })
                )}
              </SummaryRow>
              <SummaryRow label={t("toPay")}>
                {account.debtCents > 0 ? <StatusLamp tone="red"><Money cents={account.debtCents} /></StatusLamp> : <Money cents={account.debtCents} />}
              </SummaryRow>
              <SummaryRow label={t("strikesLabel")}>{t("strikes", { count: account.strikes })}</SummaryRow>
              <SummaryRow label={t("status")}>
                {account.blocked ? <StatusLamp tone="red">{t("blocked")}</StatusLamp> : <StatusLamp tone="green">{t("statusActive")}</StatusLamp>}
              </SummaryRow>
            </dl>
          </CardContent>
        </Card>
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

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-[0.9375rem] text-muted-foreground">{label}</dt>
      <dd className="text-right text-base font-semibold">{children}</dd>
    </div>
  );
}
