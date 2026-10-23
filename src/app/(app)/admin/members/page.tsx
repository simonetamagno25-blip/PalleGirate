import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { romeDay } from "@/lib/time/rome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/server/db";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const t = await getTranslations("members");
  const tc = await getTranslations("common");
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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button asChild><Link href="/admin/members/new">{t("new")}</Link></Button>
      </div>
      <form className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} />
        <Button type="submit" variant="secondary">{tc("search")}</Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("lastName")}</TableHead>
            <TableHead>{t("cardNumber")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("expiryDate")}</TableHead>
            <TableHead>{t("status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-muted-foreground">{t("none")}</TableCell></TableRow>
          )}
          {members.map((m) => (
            <TableRow key={m.id}>
              <TableCell><Link className="underline-offset-2 hover:underline" href={`/admin/members/${m.id}`}>{m.lastName} {m.firstName}</Link></TableCell>
              <TableCell>{m.membership?.number}</TableCell>
              <TableCell className="hidden sm:table-cell">{m.membership?.expiryDate}</TableCell>
              <TableCell className="space-x-1">
                {!m.passwordHash && <Badge variant="outline">{t("toActivate")}</Badge>}
                {m.membership && m.membership.expiryDate < today && <Badge variant="destructive">{t("expired")}</Badge>}
                {m.isAdmin && <Badge>{t("admin")}</Badge>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
