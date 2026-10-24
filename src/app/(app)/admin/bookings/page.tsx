import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CancelButton } from "@/components/booking/cancel-button";
import { Money } from "@/components/common/money";
import { listBookings, parseBookingFilters } from "@/server/admin-bookings";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { DATE_TIME_SHORT } from "@/lib/time/formats";

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const t = await getTranslations("adminBookings");
  const tb = await getTranslations("bookings");
  const format = await getFormatter();
  const filters = parseBookingFilters(await searchParams);
  const [bookings, fields] = await Promise.all([listBookings(prisma, filters), prisma.field.findMany({ orderBy: { sortOrder: "asc" } })]);
  const select = "h-9 rounded-md border bg-background px-2 text-sm";
  const now = new Date();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button asChild><Link href="/admin/bookings/new">{t("new")}</Link></Button>
      </div>
      <form className="flex flex-wrap items-end gap-2">
        <select name="fieldId" defaultValue={filters.fieldId ?? ""} className={select} aria-label={t("field")}>
          <option value="">{t("all")}</option>
          {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select name="status" defaultValue={filters.status ?? ""} className={select} aria-label={t("status")}>
          <option value="">{t("all")}</option>
          <option value="CONFIRMED">{tb("status.CONFIRMED")}</option>
          <option value="CANCELLED">{tb("status.CANCELLED")}</option>
        </select>
        <select name="payment" defaultValue={filters.payment ?? ""} className={select} aria-label={t("payment")}>
          <option value="">{t("all")}</option>
          {(["PENDING", "PAID", "UNPAID", "EXEMPT"] as const).map((p) => <option key={p} value={p}>{tb(`payment.${p}`)}</option>)}
        </select>
        <Input type="date" name="from" defaultValue={filters.from} aria-label={t("from")} className="w-40" />
        <Input type="date" name="to" defaultValue={filters.to} aria-label={t("to")} className="w-40" />
        {filters.memberId && <input type="hidden" name="memberId" value={filters.memberId} />}
        <Button type="submit" variant="secondary">{t("filter")}</Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("when")}</TableHead>
            <TableHead>{t("field")}</TableHead>
            <TableHead>{t("member")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("price")}</TableHead>
            <TableHead>{t("status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">{t("empty")}</TableCell></TableRow>}
          {bookings.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="whitespace-nowrap">{format.dateTime(b.start, DATE_TIME_SHORT)}</TableCell>
              <TableCell>{b.field.name}</TableCell>
              <TableCell><Link className="hover:underline" href={`/admin/members/${b.memberId}`}>{b.member.lastName} {b.member.firstName}</Link></TableCell>
              <TableCell className="hidden md:table-cell"><Money cents={b.priceCents} /></TableCell>
              <TableCell className="space-x-1">
                <Badge variant={b.status === "CANCELLED" ? "outline" : "secondary"}>{tb(`status.${b.status as "CONFIRMED" | "CANCELLED"}`)}</Badge>
                {b.chargeable && b.end <= now && <Badge variant={b.paymentStatus === "UNPAID" ? "destructive" : "secondary"}>{tb(`payment.${b.paymentStatus as "PENDING"}`)}</Badge>}
              </TableCell>
              <TableCell className="space-x-1 whitespace-nowrap text-right">
                {b.status === "CONFIRMED" && (
                  <>
                    <Button size="sm" variant="outline" asChild><Link href={`/admin/bookings/${b.id}/edit`}>{t("edit")}</Link></Button>
                    <CancelButton bookingId={b.id} mode="admin" defaultReason={t("adminReason")} />
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
