import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { CirclePlus } from "lucide-react";
import { canMemberChange } from "@/lib/booking-rules";
import { daysUntilExpiry } from "@/lib/membership";
import { addDays, isValidDay, minutesToHHMM, romeDay, romeMinutesOfDay } from "@/lib/time/rome";
import { SHORT_DAY_TIME, TIME_ONLY } from "@/lib/time/formats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Board, boardButton } from "@/components/board/board";
import { HomeDepartures } from "@/components/board/home-departures";
import { SplitFlap } from "@/components/board/split-flap";
import { CancelButton } from "@/components/booking/cancel-button";
import { Money } from "@/components/common/money";
import { StatusLamp } from "@/components/common/status-lamp";
import { getDayBoard } from "@/server/availability";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { memberAccount } from "@/server/payments";
import { getSettings } from "@/server/settings";

const LONG_DAY = { weekday: "long", day: "numeric", month: "long" } as const;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const user = await requireUser();
  const t = await getTranslations("dashboard");
  const tb = await getTranslations("bookings");
  const format = await getFormatter();
  const sp = await searchParams;
  const now = new Date();
  const today = romeDay(now);
  const settings = await getSettings(prisma);
  const lastDay = addDays(today, settings.maxAdvanceDays);
  // The departures day comes from the strip (?day=), only inside the booking horizon.
  const boardDay = isValidDay(sp.day) && sp.day >= today && sp.day <= lastDay ? sp.day : today;
  const viewer = { userId: user.id, isAdmin: false }; // The home board is always the member view: no names, even for an admin.
  const [account, upcoming, firstBoard] = await Promise.all([
    memberAccount(prisma, user.id),
    prisma.booking.findMany({ where: { memberId: user.id, status: "CONFIRMED", start: { gt: now } }, include: { field: true }, orderBy: { start: "asc" } }),
    getDayBoard(prisma, boardDay, viewer, now),
  ]);
  // After closing time today's board has nothing left: open on tomorrow instead of an empty panel ("Oggi" stays marked).
  const nowMinute = romeMinutesOfDay(now);
  const shortestSlot = Math.min(...firstBoard.rows.map((r) => r.slotMinutes));
  const closedToday = boardDay === today && firstBoard.rows.every((r) => r.starts.length === 0) && nowMinute + shortestSlot > firstBoard.closeMinutes;
  const board = closedToday && !sp.day && settings.maxAdvanceDays > 0 ? await getDayBoard(prisma, addDays(today, 1), viewer, now) : firstBoard;
  const [next, ...later] = upcoming;
  const days = user.membership ? daysUntilExpiry(user.membership.expiryDate, today) : null;
  const stripDays = Array.from({ length: settings.maxAdvanceDays + 1 }, (_, i) => addDays(today, i));

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

  // The primary action speaks in the board's voice: condensed caps.
  const bookCta = (
    <Button asChild size="lg" className="h-[3.75rem] w-full font-display text-2xl font-bold tracking-[0.04em] uppercase">
      <Link href="/book"><CirclePlus className="size-6" aria-hidden /> {t("bookNow")}</Link>
    </Button>
  );

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold md:text-3xl">{t("title", { name: user.firstName })}</h1>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Left column: next game, then the CTA at the column's foot, so both columns end on one line. */}
        <div className="flex flex-col gap-4">
          {/* (a) Next game: the one big flap time on the page. */}
          <Board id="next-game" title={t("nextGame")} className="flex-1">
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
              </div>
            )}
          </Board>

          {/* (b) The primary action, one tap away, on the full measure of the column. */}
          {bookCta}
        </div>

        {/* (c) Day strip and that day's departures; picking a day flips the board in place. */}
        <HomeDepartures initial={board} days={stripDays} today={today} nowMinute={nowMinute} />
      </div>

      {/* (d) Account summary: one compact definition list across the page, not hero metrics. */}
      <Card>
        <CardHeader><h2 className="text-lg leading-snug font-semibold">{t("account")}</h2></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
            <SummaryItem label={t("active")}>{activeCount}</SummaryItem>
            <SummaryItem label={t("card")}>
              {days === null ? (
                <StatusLamp tone="red">{t("noCard")}</StatusLamp>
              ) : days < 0 ? (
                <StatusLamp tone="red">{t("cardExpired")}</StatusLamp>
              ) : days <= settings.membershipWarningDays ? (
                <StatusLamp tone="amber">{t("cardDays", { days })}</StatusLamp>
              ) : (
                t("cardDays", { days })
              )}
            </SummaryItem>
            <SummaryItem label={t("toPay")}>
              {account.debtCents > 0 ? <StatusLamp tone="red"><Money cents={account.debtCents} /></StatusLamp> : <Money cents={account.debtCents} />}
            </SummaryItem>
            <SummaryItem label={t("strikesLabel")}>{t("strikes", { count: account.strikes })}</SummaryItem>
            <SummaryItem label={t("status")}>
              {account.blocked ? <StatusLamp tone="red">{t("blocked")}</StatusLamp> : <StatusLamp tone="green">{t("statusActive")}</StatusLamp>}
            </SummaryItem>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[0.9375rem] text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold">{children}</dd>
    </div>
  );
}
