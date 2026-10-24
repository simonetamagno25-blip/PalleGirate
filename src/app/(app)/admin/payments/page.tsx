import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/money";
import { PaymentButtons } from "@/components/admin/payment-buttons";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { pendingPayments } from "@/server/payments";

export default async function PaymentsPage() {
  await requireAdmin();
  const t = await getTranslations("payments");
  const format = await getFormatter();
  const [pending, unpaid] = await Promise.all([
    pendingPayments(prisma),
    prisma.booking.findMany({
      where: { paymentStatus: "UNPAID" },
      include: { field: true, member: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { start: "asc" },
    }),
  ]);
  const row = (b: (typeof unpaid)[number], buttons: boolean) => (
    <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-0">
      <div className="text-sm">
        <Link href={`/admin/members/${b.memberId}`} className="font-medium hover:underline">{b.member.lastName} {b.member.firstName}</Link>
        <p className="text-muted-foreground">
          {b.field.name} · {format.dateTime(b.start, { dateStyle: "medium", timeStyle: "short" })} · <Money cents={b.priceCents} />
        </p>
        {b.status === "CANCELLED" && <Badge variant="outline">{t("cancelledLate")}</Badge>}
      </div>
      <PaymentButtons bookingId={b.id} noShow={b.noShow} showNoShow={buttons} />
    </div>
  );
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{t("title")}</CardTitle></CardHeader>
        <CardContent>
          {pending.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
          {pending.map((b) => row(b, true))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("unpaidTitle")}</CardTitle></CardHeader>
        <CardContent>
          {unpaid.length === 0 && <p className="text-sm text-muted-foreground">{t("noUnpaid")}</p>}
          {unpaid.map((b) => row(b, false))}
        </CardContent>
      </Card>
    </div>
  );
}
