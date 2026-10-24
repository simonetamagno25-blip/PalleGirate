import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { canMemberChange } from "@/lib/booking-rules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CancelButton } from "@/components/booking/cancel-button";
import { Money } from "@/components/money";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { getSettings } from "@/server/settings";
import { SHORT_DAY_TIME, TIME_ONLY } from "@/lib/time/formats";

export default async function MyBookingsPage() {
  const user = await requireUser();
  const t = await getTranslations("bookings");
  const format = await getFormatter();
  const now = new Date();
  const [settings, bookings] = await Promise.all([
    getSettings(prisma),
    prisma.booking.findMany({ where: { memberId: user.id }, include: { field: true }, orderBy: { start: "desc" }, take: 200 }),
  ]);
  const upcoming = bookings.filter((b) => b.status === "CONFIRMED" && b.end > now).reverse();
  const history = bookings.filter((b) => !upcoming.includes(b));
  const when = (b: (typeof bookings)[number]) =>
    `${format.dateTime(b.start, SHORT_DAY_TIME)} – ${format.dateTime(b.end, TIME_ONLY)}`;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <Card>
        <CardHeader><CardTitle>{t("upcoming")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
          {upcoming.map((b) => {
            const changeable = canMemberChange(b.start, now, settings);
            return (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <div>
                  <p className="font-medium">{b.field.name}</p>
                  <p className="text-sm text-muted-foreground">{when(b)} · <Money cents={b.priceCents} /></p>
                  {!changeable && <p className="text-xs text-muted-foreground">{t("lateNotice", { hours: settings.changeWindowMinutes / 60 })}</p>}
                </div>
                {changeable && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild><Link href={`/bookings/${b.id}/edit`}>{t("edit")}</Link></Button>
                    <CancelButton bookingId={b.id} mode="member" />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("history")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
          {history.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
              <span>{b.field.name} · {when(b)}</span>
              <span className="flex gap-1">
                <Badge variant={b.status === "CANCELLED" ? "outline" : "secondary"}>{t(`status.${b.status as "CONFIRMED" | "CANCELLED"}`)}</Badge>
                {b.chargeable && <Badge variant={b.paymentStatus === "UNPAID" ? "destructive" : "secondary"}>{t(`payment.${b.paymentStatus as "PENDING" | "PAID" | "UNPAID" | "EXEMPT"}`)}</Badge>}
              </span>
              {b.status === "CANCELLED" && b.cancelledById === null && <p className="w-full text-xs text-muted-foreground">{t("cancelledBlocked")}</p>}
              {b.cancelReason && <p className="w-full text-xs text-muted-foreground">{b.cancelReason}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
