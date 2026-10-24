import { requireAdmin } from "@/server/guards";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Search, UserPlus } from "lucide-react";
import { romeDay } from "@/lib/time/rome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DenseCell, DenseList, DenseListItem, DenseRow, DenseTable, EmptyState } from "@/components/admin/dense-table";
import { PageHeader } from "@/components/common/page-header";
import { StatusLamp } from "@/components/common/status-lamp";
import { prisma } from "@/server/db";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const t = await getTranslations("members");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const q = (await searchParams).q?.trim() ?? "";
  const today = romeDay(new Date());
  const members = await prisma.user.findMany({
    where: q
      ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q.toLowerCase() } }, { membership: { number: { contains: q.toUpperCase() } } }] }
      : undefined,
    include: { membership: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 200,
  });

  type Row = (typeof members)[number];
  const date = (d: string) => format.dateTime(new Date(`${d}T12:00:00Z`), { dateStyle: "medium" });
  const name = (m: Row) => (
    <Link className="font-semibold underline-offset-4 hover:underline" href={`/admin/members/${m.id}`}>{m.lastName} {m.firstName}</Link>
  );
  const lamps = (m: Row) => {
    const expired = !!m.membership && m.membership.expiryDate < today;
    return (
      <span className="flex flex-wrap gap-x-4 gap-y-1 text-[0.9375rem]">
        {!m.passwordHash && <StatusLamp tone="amber">{t("toActivate")}</StatusLamp>}
        {expired && <StatusLamp tone="red">{t("expired")}</StatusLamp>}
        {m.passwordHash && !expired && <StatusLamp tone="green">{t("active")}</StatusLamp>}
        {m.isAdmin && <StatusLamp tone="blue">{t("admin")}</StatusLamp>}
      </span>
    );
  };
  const card = (m: Row) => m.membership && <span className="font-display text-lg font-bold tracking-[0.04em]">{m.membership.number}</span>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("count", { count: members.length })}
        actions={<Button asChild><Link href="/admin/members/new"><UserPlus className="size-5" aria-hidden /> {t("new")}</Link></Button>}
      />

      <form role="search" className="flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" type="search" defaultValue={q} aria-label={t("searchPlaceholder")} placeholder={t("searchShort")} className="pl-10" />
        </div>
        <Button type="submit" variant="secondary">{tc("search")}</Button>
      </form>

      {members.length === 0 ? (
        <EmptyState
          action={
            q ? (
              <Button asChild variant="outline"><Link href="/admin/members">{t("showAll")}</Link></Button>
            ) : (
              <Button asChild><Link href="/admin/members/new">{t("new")}</Link></Button>
            )
          }
        >
          {t("none")}
        </EmptyState>
      ) : (
        <>
          <div className="hidden md:block">
            <DenseTable
              caption={t("title")}
              headers={[
                { key: "name", label: t("member") },
                { key: "card", label: t("cardNumber") },
                { key: "expiry", label: t("expiryDate") },
                { key: "status", label: t("status") },
              ]}
            >
              {members.map((m) => (
                <DenseRow key={m.id}>
                  <DenseCell>
                    {name(m)}
                    <span className="block text-[0.9375rem] break-all text-muted-foreground">{m.email}</span>
                  </DenseCell>
                  <DenseCell>{card(m)}</DenseCell>
                  <DenseCell className="whitespace-nowrap">{m.membership && date(m.membership.expiryDate)}</DenseCell>
                  <DenseCell>{lamps(m)}</DenseCell>
                </DenseRow>
              ))}
            </DenseTable>
          </div>

          <DenseList label={t("title")} className="md:hidden">
            {members.map((m) => (
              <DenseListItem key={m.id}>
                <div className="min-w-0">
                  <p className="text-[1.0625rem]">{name(m)}</p>
                  <p className="text-[0.9375rem] break-all text-muted-foreground">{m.email}</p>
                </div>
                {m.membership && (
                  <dl className="grid grid-cols-2 gap-x-4 text-[0.9375rem]">
                    <div>
                      <dt className="text-muted-foreground">{t("cardNumber")}</dt>
                      <dd>{card(m)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t("expiryDate")}</dt>
                      <dd className="leading-7">{date(m.membership.expiryDate)}</dd>
                    </div>
                  </dl>
                )}
                {lamps(m)}
              </DenseListItem>
            ))}
          </DenseList>
        </>
      )}
    </div>
  );
}
