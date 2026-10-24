import Link from "next/link";
import { requireAdmin } from "@/server/guards";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { CirclePlus } from "lucide-react";
import { proposeRenewal } from "@/lib/membership";
import { minutesToHHMM, romeDay, romeMinutesOfDay } from "@/lib/time/rome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DenseCell, DenseList, DenseListItem, DenseRow, DenseTable, EmptyState, When } from "@/components/admin/dense-table";
import { MemberActions } from "@/components/admin/member-actions";
import { MemberForm } from "@/components/admin/member-form";
import { DefList, DefRow } from "@/components/common/def-list";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { PAYMENT_TONE, STATUS_TONE, StatusLamp } from "@/components/common/status-lamp";
import { prisma } from "@/server/db";
import { memberAccount } from "@/server/payments";

const SHORT_DAY = { weekday: "short", day: "numeric", month: "short", year: "numeric" } as const;

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const t = await getTranslations("members");
  const user = await prisma.user.findUnique({ where: { id }, include: { membership: { include: { renewals: { orderBy: { createdAt: "desc" } } } } } });
  if (!user) notFound();
  const format = await getFormatter();
  const tb = await getTranslations("bookings");
  const tab = await getTranslations("adminBookings");
  const tn = await getTranslations("nav");
  const [account, history] = await Promise.all([
    memberAccount(prisma, user.id),
    prisma.booking.findMany({ where: { memberId: user.id }, include: { field: true }, orderBy: { start: "desc" }, take: 50 }),
  ]);
  const today = romeDay(new Date());
  const m = user.membership;
  const date = (d: string) => format.dateTime(new Date(`${d}T12:00:00Z`), { dateStyle: "medium" });
  const hhmm = (d: Date) => minutesToHHMM(romeMinutesOfDay(d));
  const proposed = m ? proposeRenewal(today, m.expiryDate).expiryDate : null;

  type Row = (typeof history)[number];
  const when = (b: Row) => <When time={hhmm(b.start)} end={hhmm(b.end)} day={format.dateTime(b.start, SHORT_DAY)} />;
  const statusLamp = (b: Row) => (
    <StatusLamp tone={STATUS_TONE[b.status] ?? "neutral"}>
      {b.status === "CANCELLED" && !b.cancelledById ? tab("system") : tb(`status.${b.status as "CONFIRMED" | "CANCELLED"}`)}
    </StatusLamp>
  );
  const paymentLamp = (b: Row) =>
    b.chargeable && <StatusLamp tone={PAYMENT_TONE[b.paymentStatus] ?? "neutral"}>{tb(`payment.${b.paymentStatus as "PENDING" | "PAID" | "UNPAID" | "EXEMPT"}`)}</StatusLamp>;

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: "/admin/members", label: tn("adminMembers") }}
        title={<>{user.lastName} {user.firstName}</>}
        description={<span className="break-all">{user.email}</span>}
        actions={<Button asChild><Link href={`/admin/bookings/new?memberId=${user.id}`}><CirclePlus className="size-5" aria-hidden /> {tab("new")}</Link></Button>}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader><h2 className="text-lg leading-snug font-semibold">{t("account")}</h2></CardHeader>
            <CardContent>
              <DefList>
                <DefRow label={t("status")}>
                  {account.blocked ? <StatusLamp tone="red">{t("blocked")}</StatusLamp> : <StatusLamp tone="green">{t("active")}</StatusLamp>}
                </DefRow>
                <DefRow label={t("strikes")}>{account.strikes}</DefRow>
                <DefRow label={t("unpaid")}>{account.unpaid}</DefRow>
                <DefRow label={t("debt")}>
                  {account.debtCents > 0 ? <StatusLamp tone="red"><Money cents={account.debtCents} /></StatusLamp> : <Money cents={account.debtCents} />}
                </DefRow>
                <DefRow label={t("cardNumber")}>
                  {m ? <span className="font-display text-lg font-bold tracking-[0.04em]">{m.number}</span> : <StatusLamp tone="red">{t("noCard")}</StatusLamp>}
                </DefRow>
                {m && (
                  <DefRow label={t("expiryDate")}>
                    {m.expiryDate < today ? <StatusLamp tone="red">{t("expiredOn", { date: date(m.expiryDate) })}</StatusLamp> : date(m.expiryDate)}
                  </DefRow>
                )}
                <DefRow label={t("login")}>
                  {user.passwordHash ? t("activated") : <StatusLamp tone="amber">{t("toActivate")}</StatusLamp>}
                </DefRow>
                {user.isAdmin && <DefRow label={t("role")}><StatusLamp tone="blue">{t("admin")}</StatusLamp></DefRow>}
              </DefList>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-lg leading-snug font-semibold">{t("access")}</h2></CardHeader>
            <CardContent>
              <MemberActions
                userId={user.id}
                isAdmin={user.isAdmin}
                hasMembership={!!m}
                proposedExpiry={proposed}
                proposedLabel={proposed ? date(proposed) : undefined}
              />
            </CardContent>
          </Card>

          {m && m.renewals.length > 0 && (
            <Card>
              <CardHeader><h2 className="text-lg leading-snug font-semibold">{t("renewals")}</h2></CardHeader>
              <CardContent>
                <ul className="divide-y text-base">
                  {m.renewals.map((r) => (
                    <li key={r.id} className="py-2 first:pt-0 last:pb-0">{date(r.issueDate)} – {date(r.expiryDate)}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader><h2 className="text-lg leading-snug font-semibold">{t("details")}</h2></CardHeader>
          <CardContent>
            <MemberForm
              userId={user.id}
              initial={{
                firstName: user.firstName, lastName: user.lastName, birthDate: user.birthDate ?? "", email: user.email, phone: user.phone ?? "",
                cardNumber: m?.number ?? "", issueDate: m?.issueDate ?? today, expiryDate: m?.expiryDate ?? today,
              }}
            />
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="history" className="space-y-3">
        <h2 id="history" className="text-xl font-semibold">{t("history")}</h2>
        {history.length === 0 ? (
          <EmptyState action={<Button asChild variant="outline"><Link href={`/admin/bookings/new?memberId=${user.id}`}>{tab("new")}</Link></Button>}>
            {tb("empty")}
          </EmptyState>
        ) : (
          <>
            <div className="hidden md:block">
              <DenseTable
                caption={t("history")}
                headers={[
                  { key: "when", label: tab("when") },
                  { key: "field", label: tab("field") },
                  { key: "price", label: tab("price"), className: "text-right" },
                  { key: "status", label: tab("status") },
                  { key: "payment", label: tab("payment") },
                ]}
              >
                {history.map((b) => (
                  <DenseRow key={b.id} muted={b.status === "CANCELLED"}>
                    <DenseCell>{when(b)}</DenseCell>
                    <DenseCell className="font-medium">{b.field.name}</DenseCell>
                    <DenseCell className="text-right whitespace-nowrap"><Money cents={b.priceCents} /></DenseCell>
                    <DenseCell className="text-[0.9375rem]">
                      {statusLamp(b)}
                      {b.cancelReason && <span className="mt-1 block max-w-72 text-sm text-muted-foreground">{b.cancelReason}</span>}
                    </DenseCell>
                    <DenseCell className="text-[0.9375rem]">{paymentLamp(b)}</DenseCell>
                  </DenseRow>
                ))}
              </DenseTable>
            </div>
            <DenseList label={t("history")} className="md:hidden">
              {history.map((b) => (
                <DenseListItem key={b.id} className={b.status === "CANCELLED" ? "text-muted-foreground" : undefined}>
                  <div className="flex items-start justify-between gap-4">
                    {when(b)}
                    <span className="pt-1 whitespace-nowrap"><Money cents={b.priceCents} /></span>
                  </div>
                  <p className="font-semibold">{b.field.name}</p>
                  <span className="flex flex-wrap gap-x-4 gap-y-1 text-[0.9375rem]">
                    {statusLamp(b)}
                    {paymentLamp(b)}
                  </span>
                  {b.cancelReason && <p className="text-[0.9375rem] text-muted-foreground">{b.cancelReason}</p>}
                </DenseListItem>
              ))}
            </DenseList>
          </>
        )}
      </section>
    </div>
  );
}
