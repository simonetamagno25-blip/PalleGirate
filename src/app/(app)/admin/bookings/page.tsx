import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { CirclePlus } from "lucide-react";
import { minutesToHHMM, romeMinutesOfDay } from "@/lib/time/rome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CancelButton } from "@/components/booking/cancel-button";
import { DenseCell, DenseList, DenseListItem, DenseRow, DenseTable, EmptyState, When } from "@/components/admin/dense-table";
import { Money } from "@/components/common/money";
import { NativeSelect } from "@/components/common/native-select";
import { PageHeader } from "@/components/common/page-header";
import { PAYMENT_TONE, STATUS_TONE, StatusLamp } from "@/components/common/status-lamp";
import { listBookings, parseBookingFilters } from "@/server/admin-bookings";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/guards";

const SHORT_DAY = { weekday: "short", day: "numeric", month: "short", year: "numeric" } as const;

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const t = await getTranslations("adminBookings");
  const tb = await getTranslations("bookings");
  const format = await getFormatter();
  const filters = parseBookingFilters(await searchParams);
  const [bookings, fields] = await Promise.all([listBookings(prisma, filters), prisma.field.findMany({ orderBy: { sortOrder: "asc" } })]);
  const now = new Date();
  const filtered = Object.values(filters).some(Boolean);
  const hhmm = (d: Date) => minutesToHHMM(romeMinutesOfDay(d));

  type Row = (typeof bookings)[number];
  const when = (b: Row) => <When time={hhmm(b.start)} end={hhmm(b.end)} day={format.dateTime(b.start, SHORT_DAY)} />;
  const member = (b: Row) => (
    <Link className="font-medium underline-offset-4 hover:underline" href={`/admin/members/${b.memberId}`}>
      {b.member.lastName} {b.member.firstName}
    </Link>
  );
  const lamps = (b: Row) => (
    <span className="flex flex-col gap-1 text-[0.9375rem]">
      <StatusLamp tone={STATUS_TONE[b.status] ?? "neutral"}>
        {b.status === "CANCELLED" && !b.cancelledById ? t("system") : tb(`status.${b.status as "CONFIRMED" | "CANCELLED"}`)}
      </StatusLamp>
      {b.chargeable && b.end <= now && (
        <StatusLamp tone={PAYMENT_TONE[b.paymentStatus] ?? "neutral"}>{tb(`payment.${b.paymentStatus as "PENDING" | "PAID" | "UNPAID" | "EXEMPT"}`)}</StatusLamp>
      )}
    </span>
  );
  const actions = (b: Row) =>
    b.status === "CONFIRMED" && (
      <span className="flex items-center gap-2 lg:justify-end">
        <Button size="default" variant="outline" asChild><Link href={`/admin/bookings/${b.id}/edit`}>{t("edit")}</Link></Button>
        <CancelButton bookingId={b.id} mode="admin" defaultReason={t("adminReason")} size="default" />
      </span>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("count", { count: bookings.length })}
        actions={<Button asChild><Link href="/admin/bookings/new"><CirclePlus className="size-5" aria-hidden /> {t("new")}</Link></Button>}
      />

      <form aria-label={t("filters")} className="grid grid-cols-2 items-end gap-3 rounded-lg bg-card p-4 ring-1 ring-border md:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="f-field">{t("field")}</Label>
          <NativeSelect id="f-field" name="fieldId" defaultValue={filters.fieldId ?? ""}>
            <option value="">{t("all")}</option>
            {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-status">{t("status")}</Label>
          <NativeSelect id="f-status" name="status" defaultValue={filters.status ?? ""}>
            <option value="">{t("all")}</option>
            <option value="CONFIRMED">{tb("status.CONFIRMED")}</option>
            <option value="CANCELLED">{tb("status.CANCELLED")}</option>
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-payment">{t("payment")}</Label>
          <NativeSelect id="f-payment" name="payment" defaultValue={filters.payment ?? ""}>
            <option value="">{t("all")}</option>
            {(["PENDING", "PAID", "UNPAID", "EXEMPT"] as const).map((p) => <option key={p} value={p}>{tb(`payment.${p}`)}</option>)}
          </NativeSelect>
        </div>
        <div className="col-start-1 space-y-1.5 xl:col-start-auto">
          <Label htmlFor="f-from">{t("from")}</Label>
          <Input id="f-from" type="date" name="from" defaultValue={filters.from} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-to">{t("to")}</Label>
          <Input id="f-to" type="date" name="to" defaultValue={filters.to} />
        </div>
        {filters.memberId && <input type="hidden" name="memberId" value={filters.memberId} />}
        <div className="col-span-2 flex gap-2 md:col-span-1">
          <Button type="submit" variant="secondary" className="flex-1 xl:flex-none">{t("filter")}</Button>
          {filtered && <Button asChild variant="ghost"><Link href="/admin/bookings">{t("reset")}</Link></Button>}
        </div>
      </form>

      {bookings.length === 0 ? (
        <EmptyState action={filtered ? <Button asChild variant="outline"><Link href="/admin/bookings">{t("reset")}</Link></Button> : undefined}>
          {t("empty")}
        </EmptyState>
      ) : (
        <>
          <div className="hidden lg:block">
            <DenseTable
              caption={t("title")}
              headers={[
                { key: "when", label: t("when") },
                { key: "field", label: t("field") },
                { key: "member", label: t("member") },
                { key: "price", label: t("price"), className: "text-right" },
                { key: "status", label: t("status") },
                { key: "actions", srLabel: t("actions") },
              ]}
            >
              {bookings.map((b) => (
                <DenseRow key={b.id} muted={b.status === "CANCELLED"}>
                  <DenseCell>{when(b)}</DenseCell>
                  <DenseCell className="font-medium">{b.field.name}</DenseCell>
                  <DenseCell>{member(b)}</DenseCell>
                  <DenseCell className="text-right whitespace-nowrap"><Money cents={b.priceCents} /></DenseCell>
                  <DenseCell>
                    {lamps(b)}
                    {b.cancelReason && <span className="mt-1 block max-w-64 text-sm text-muted-foreground">{b.cancelReason}</span>}
                  </DenseCell>
                  <DenseCell className="text-right">{actions(b)}</DenseCell>
                </DenseRow>
              ))}
            </DenseTable>
          </div>

          <DenseList label={t("title")} className="lg:hidden">
            {bookings.map((b) => (
              <DenseListItem key={b.id} className={b.status === "CANCELLED" ? "text-muted-foreground" : undefined}>
                <div className="flex items-start justify-between gap-4">
                  {when(b)}
                  <span className="pt-1 whitespace-nowrap"><Money cents={b.priceCents} /></span>
                </div>
                <div>
                  <p className="text-[1.0625rem] font-semibold">{b.field.name}</p>
                  <p>{member(b)}</p>
                </div>
                {lamps(b)}
                {b.cancelReason && <p className="text-[0.9375rem] text-muted-foreground">{b.cancelReason}</p>}
                {actions(b)}
              </DenseListItem>
            ))}
          </DenseList>
        </>
      )}
    </div>
  );
}
