import { requireAdmin } from "@/server/guards";
import { getTranslations } from "next-intl/server";
import { defaultExpiry } from "@/lib/membership";
import { romeDay } from "@/lib/time/rome";
import { MemberForm } from "@/components/admin/member-form";

export default async function NewMemberPage() {
  await requireAdmin();
  const t = await getTranslations("members");
  const today = romeDay(new Date());
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("new")}</h1>
      <MemberForm
        userId={null}
        initial={{ firstName: "", lastName: "", birthDate: "", email: "", phone: "", cardNumber: "", issueDate: today, expiryDate: defaultExpiry(today) }}
      />
    </div>
  );
}
