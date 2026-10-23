import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { proposeRenewal } from "@/lib/membership";
import { romeDay } from "@/lib/time/rome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberForm } from "@/components/admin/member-form";
import { MemberActions } from "@/components/admin/member-actions";
import { prisma } from "@/server/db";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("members");
  const user = await prisma.user.findUnique({ where: { id }, include: { membership: { include: { renewals: { orderBy: { createdAt: "desc" } } } } } });
  if (!user) notFound();
  const today = romeDay(new Date());
  const m = user.membership;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{user.lastName} {user.firstName}</h1>
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
    </div>
  );
}
