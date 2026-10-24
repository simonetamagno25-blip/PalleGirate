"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ViolationList } from "@/components/common/violation-list";
import { saveMemberAction } from "@/app/(app)/admin/members/actions";

export type MemberFormValues = {
  firstName: string; lastName: string; birthDate: string; email: string; phone: string;
  cardNumber: string; issueDate: string; expiryDate: string;
};

export function MemberForm({ userId, initial }: { userId: string | null; initial: MemberFormValues }) {
  const t = useTranslations("members");
  const tc = useTranslations("common");
  const router = useRouter();
  const [state, action, pending] = useActionState(saveMemberAction.bind(null, userId), null);
  useEffect(() => {
    if (state?.ok) {
      toast.success(t("saved"));
      router.push(`/admin/members/${state.data.id}`);
    }
  }, [state, router, t]);
  const field = (name: keyof MemberFormValues, type = "text", required = true, autoComplete?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{t(name)}</Label>
      <Input id={name} name={name} type={type} defaultValue={initial[name]} required={required} autoComplete={autoComplete} />
    </div>
  );
  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="mb-3 text-base font-semibold">{t("personal")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("firstName", "text", true, "off")}
          {field("lastName", "text", true, "off")}
          {field("email", "email", true, "off")}
          {field("phone", "tel", false, "off")}
          {field("birthDate", "date", false)}
        </div>
      </fieldset>
      <div className="border-t pt-5">
        <fieldset>
          <legend className="mb-3 text-base font-semibold">{t("cardSection")}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{field("cardNumber", "text", true, "off")}</div>
            {field("issueDate", "date")}
            {field("expiryDate", "date")}
          </div>
        </fieldset>
      </div>
      {state && !state.ok && <ViolationList violations={state.violations} />}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">{tc("save")}</Button>
    </form>
  );
}
