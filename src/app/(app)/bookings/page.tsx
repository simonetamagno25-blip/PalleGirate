import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { CirclePlus } from "lucide-react";
import { canMemberChange } from "@/lib/booking-rules";
import { minutesToHHMM, romeMinutesOfDay } from "@/lib/time/rome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Board, boardButton } from "@/components/board/board";
import { SplitFlap } from "@/components/board/split-flap";
import { CancelButton } from "@/components/booking/cancel-button";
import { Money } from "@/components/common/money";
import { StatusLamp, type LampTone } from "@/components/common/status-lamp";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

const LONG_DAY = { weekday: "long", day: "numeric", month: "long" } as const;
const SHORT_DAY = { weekday: "short", day: "numeric", month: "short", year: "numeric" } as const;
const PAYMENT_TONE: Record<string, LampTone> = { PENDING: "amber", PAID: "green", UNPAID: "red", EXEMPT: "blue" };

export default async function MyBookingsPage() {
  const user = await requireUser();
  const t = await getTranslations("bookings");
  const td = await getTranslations("dashboard");
  const tw = await getTranslations("wizard");
  const format = await getFormatter();
  const now = new Date();
  const [settings, bookings] = await Promise.all([
    getSettings(prisma),
    prisma.booking.findMany({ where: { memberId: user.id }, include: { field: true }, orderBy: { start: "desc" }, take: 200 }),
  ]);
  const upcoming = bookings.filter((b) => b.status === "CONFIRMED" && b.end > now).reverse();
  const history = bookings.filter((b) => !upcoming.includes(b));
  const hhmm = (d: Date) => minutesToHHMM(romeMinutesOfDay(d));
  const range = (b: (typeof bookings)[number]) => hhmm(b.start) + "–" + hhmm(b.end);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold md:text-3xl">{t("title")}</h1>

      <Board id="upcoming" title={t("upcoming")}>
        {upcoming.length === 0 ? (
          <div className="space-y-4">
            <p className="text-base text-flap-ink-muted">{t("empty")}</p>
            <Button asChild size="lg" className="w-full sm:w-auto"><Link href="/book"><CirclePlus className="size-5" aria-hidden /> {td("bookNow")}</Link></Button>
          </div>
        ) : (
          <ul>
            {upcoming.map((b) => {
              const changeable = canMemberChange(b.start, now, settings);
              return (
                <li key={b.id} className="space-y-3 border-t border-flap-seam py-4 first:border-t-0 first:pt-1 last:pb-1">
                  <div className="flex items-start gap-4">
                    <SplitFlap value={hhmm(b.start)} size="sm" className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-xl leading-tight font-bold tracking-[0.03em] uppercase">{b.field.name}</p>
                      <p className="text-base text-flap-ink">{format.dateTime(b.start, LONG_DAY)}</p>
                      <p className="text-[0.9375rem] text-flap-ink-muted">{td("until", { time: hhmm(b.end) })}</p>
                    </div>
                    <p className="shrink-0 font-display text-xl leading-tight font-bold">
                      <span className="sr-only">{tw("price")}</span>
                      <Money cents={b.priceCents} />
                    </p>
                  </div>
                  {changeable ? (
                    <div className="flex items-center gap-3">
                      <Button asChild variant="outline" className={boardButton}><Link href={`/bookings/${b.id}/edit`}>{t("edit")}</Link></Button>
                      <CancelButton bookingId={b.id} mode="member" onBoard size="default" className="ml-auto" />
                    </div>
                  ) : (
                    <StatusLamp tone="neutral" onBoard className="text-[0.9375rem] whitespace-normal text-flap-ink-muted">
                      {t("lateNotice", { hours: settings.changeWindowMinutes / 60 })}
                    </StatusLamp>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Board>

      <Card>
        <CardHeader><CardTitle>{t("history")}</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 && <p className="text-base text-muted-foreground">{t("empty")}</p>}
          <ul className="divide-y">
            {history.map((b) => (
              <li key={b.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-[1.0625rem] font-semibold">{b.field.name}</p>
                  <p className="text-base text-muted-foreground">{format.dateTime(b.start, SHORT_DAY)}</p>
                  <p className="text-base text-muted-foreground">{range(b)}</p>
                </div>
                <div className="flex flex-col items-start gap-1 text-[0.9375rem] sm:items-end">
                  <StatusLamp tone={b.status === "CANCELLED" ? "red" : "neutral"}>{t(`status.${b.status as "CONFIRMED" | "CANCELLED"}`)}</StatusLamp>
                  {b.chargeable && (
                    <StatusLamp tone={PAYMENT_TONE[b.paymentStatus] ?? "neutral"}>{t(`payment.${b.paymentStatus as "PENDING" | "PAID" | "UNPAID" | "EXEMPT"}`)}</StatusLamp>
                  )}
                </div>
                {b.status === "CANCELLED" && b.cancelledById === null && <p className="w-full text-[0.9375rem] text-muted-foreground">{t("cancelledBlocked")}</p>}
                {b.cancelReason && <p className="w-full text-[0.9375rem] text-muted-foreground">{b.cancelReason}</p>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
