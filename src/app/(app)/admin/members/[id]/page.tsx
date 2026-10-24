import Link from "next/link";
import { requireAdmin } from "@/server/guards";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { proposeRenewal } from "@/lib/membership";
import { romeDay } from "@/lib/time/rome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/money";
import { MemberForm } from "@/components/admin/member-form";
import { MemberActions } from "@/components/admin/member-actions";
import { prisma } from "@/server/db";
import { memberAccount } from "@/server/payments";
import { DATE_TIME_MEDIUM } from "@/lib/time/formats";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const t = await getTranslations("members");
  const user = await prisma.user.findUnique({ where: { id }, include: { membership: { include: { renewals: { orderBy: { createdAt: "desc" } } } } } });
  if (!user) notFound();
  const format = await getFormatter();
  const tb = await getTranslations("bookings");
  const tab = await getTranslations("adminBookings");
  const [account, history] = await Promise.all([
    memberAccount(prisma, user.id),
    prisma.booking.findMany({ where: { memberId: user.id }, include: { field: true }, orderBy: { start: "desc" }, take: 50 }),
  ]);
  const today = romeDay(new Date());
  const m = user.membership;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{user.lastName} {user.firstName}</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("strikes")}</p><p className="text-2xl font-semibold">{account.strikes}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("unpaid")}</p><p className="text-2xl font-semibold">{account.unpaid}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("debt")}</p><p className="text-2xl font-semibold"><Money cents={account.debtCents} /></p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("status")}</p>{account.blocked ? <Badge variant="destructive">{t("blocked")}</Badge> : <Badge variant="secondary">{t("active")}</Badge>}</CardContent></Card>
      </div>
      <Button asChild variant="outline"><Link href={`/admin/bookings/new?memberId=${user.id}`}>{tab("new")}</Link></Button>
      <Card>
        <CardContent className="pt-6">
          <MemberForm
            userId={user.id}
            initial={{
              firstName: user.firstName, lastName: user.lastName, birthDate: user.birthDate ?? "", email: user.email, phone: user.phone ?? "",
              cardNumber: m?.number ?? "", issueDate: m?.issueDate ?? today, expiryDate: m?.expiryDate ?? today,
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <MemberActions userId={user.id} isAdmin={user.isAdmin} hasMembership={!!m} proposedExpiry={m ? proposeRenewal(today, m.expiryDate).expiryDate : null} />
        </CardContent>
      </Card>
      {m && (
        <Card>
          <CardHeader><CardTitle>{t("renewals")}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {m.renewals.map((r) => <li key={r.id}>{r.issueDate} – {r.expiryDate}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>{t("history")}</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {history.map((b) => (
            <div key={b.id} className="flex flex-wrap justify-between gap-2 border-b py-1 last:border-0">
              <span>{b.field.name} · {format.dateTime(b.start, DATE_TIME_MEDIUM)}</span>
              <span className="space-x-1">
                <Badge variant="outline">{tb(`status.${b.status as "CONFIRMED" | "CANCELLED"}`)}</Badge>
                {b.chargeable && <Badge variant={b.paymentStatus === "UNPAID" ? "destructive" : "secondary"}>{tb(`payment.${b.paymentStatus as "PENDING"}`)}</Badge>}
                {b.status === "CANCELLED" && !b.cancelledById && <Badge variant="destructive">{tab("system")}</Badge>}
              </span>
              {b.cancelReason && <p className="w-full text-xs text-muted-foreground">{b.cancelReason}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
