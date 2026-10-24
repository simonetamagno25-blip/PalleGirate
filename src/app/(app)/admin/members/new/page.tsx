import { requireAdmin } from "@/server/guards";
import { getTranslations } from "next-intl/server";
import { defaultExpiry } from "@/lib/membership";
import { romeDay } from "@/lib/time/rome";
import { Card, CardContent } from "@/components/ui/card";
import { MemberForm } from "@/components/admin/member-form";
import { PageHeader } from "@/components/common/page-header";

export default async function NewMemberPage() {
  await requireAdmin();
  const t = await getTranslations("members");
  const tn = await getTranslations("nav");
  const today = romeDay(new Date());
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader back={{ href: "/admin/members", label: tn("adminMembers") }} title={t("new")} description={t("newHint")} />
      <Card>
        <CardContent>
          <MemberForm
            userId={null}
            initial={{ firstName: "", lastName: "", birthDate: "", email: "", phone: "", cardNumber: "", issueDate: today, expiryDate: defaultExpiry(today) }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
