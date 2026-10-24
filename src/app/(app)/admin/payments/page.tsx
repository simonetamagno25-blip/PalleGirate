import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { minutesToHHMM, romeMinutesOfDay } from "@/lib/time/rome";
import { DenseCell, DenseList, DenseListItem, DenseRow, DenseTable, EmptyState, When } from "@/components/admin/dense-table";
import { PaymentButtons } from "@/components/admin/payment-buttons";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { StatusLamp } from "@/components/common/status-lamp";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { pendingPayments } from "@/server/payments";

const SHORT_DAY = { weekday: "short", day: "numeric", month: "short", year: "numeric" } as const;

export default async function PaymentsPage() {
  await requireAdmin();
  const t = await getTranslations("payments");
  const tn = await getTranslations("nav");
  const tab = await getTranslations("adminBookings");
  const format = await getFormatter();
  const [pending, unpaid] = await Promise.all([
    pendingPayments(prisma),
    prisma.booking.findMany({
      where: { paymentStatus: "UNPAID" },
      include: { field: true, member: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { start: "asc" },
    }),
  ]);
  const hhmm = (d: Date) => minutesToHHMM(romeMinutesOfDay(d));
  const unpaidTotal = unpaid.reduce((sum, b) => sum + b.priceCents, 0);

  type Row = (typeof unpaid)[number];
  const member = (b: Row) => (
    <Link href={`/admin/members/${b.memberId}`} className="font-medium underline-offset-4 hover:underline">{b.member.lastName} {b.member.firstName}</Link>
  );
  const late = (b: Row) => b.status === "CANCELLED" && <StatusLamp tone="red" className="text-[0.9375rem]">{t("cancelledLate")}</StatusLamp>;

  const section = (id: string, title: string, meta: React.ReactNode, rows: Row[], empty: string, isPending: boolean) => (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={id} className="text-xl font-semibold">{title}</h2>
        <p className="text-base text-muted-foreground">{meta}</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        <>
          <div className="hidden lg:block">
            <DenseTable
              caption={title}
              headers={[
                { key: "member", label: tab("member") },
                { key: "field", label: tab("field") },
                { key: "when", label: tab("when") },
                { key: "price", label: tab("price"), className: "text-right" },
                { key: "record", label: t("record") },
              ]}
            >
              {rows.map((b) => (
                <DenseRow key={b.id}>
                  <DenseCell>{member(b)}</DenseCell>
                  <DenseCell>
                    <span className="block font-medium">{b.field.name}</span>
                    {late(b)}
                  </DenseCell>
                  <DenseCell><When time={hhmm(b.start)} end={hhmm(b.end)} day={format.dateTime(b.start, SHORT_DAY)} /></DenseCell>
                  <DenseCell className="text-right font-semibold whitespace-nowrap"><Money cents={b.priceCents} /></DenseCell>
                  <DenseCell><PaymentButtons bookingId={b.id} noShow={b.noShow} showNoShow={isPending} current={b.paymentStatus} /></DenseCell>
                </DenseRow>
              ))}
            </DenseTable>
          </div>
          <DenseList label={title} className="lg:hidden">
            {rows.map((b) => (
              <DenseListItem key={b.id} className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[1.0625rem]">{member(b)}</p>
                    <p className="font-medium">{b.field.name}</p>
                  </div>
                  <span className="font-semibold whitespace-nowrap"><Money cents={b.priceCents} /></span>
                </div>
                <When time={hhmm(b.start)} end={hhmm(b.end)} day={format.dateTime(b.start, SHORT_DAY)} />
                {late(b)}
                <PaymentButtons bookingId={b.id} noShow={b.noShow} showNoShow={isPending} current={b.paymentStatus} />
              </DenseListItem>
            ))}
          </DenseList>
        </>
      )}
    </section>
  );

  return (
    <div className="space-y-8">
      <PageHeader title={tn("adminPayments")} description={t("intro")} />
      {section("pending", t("title"), tab("count", { count: pending.length }), pending, t("empty"), true)}
      {section(
        "unpaid",
        t("unpaidTitle"),
        unpaid.length > 0 ? t("unpaidTotal", { count: unpaid.length, total: format.number(unpaidTotal / 100, { style: "currency", currency: "EUR" }) }) : null,
        unpaid,
        t("noUnpaid"),
        false,
      )}
    </div>
  );
}
