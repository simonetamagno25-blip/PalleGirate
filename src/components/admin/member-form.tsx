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
  const field = (name: keyof MemberFormValues, type = "text", required = true) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{t(name)}</Label>
      <Input id={name} name={name} type={type} defaultValue={initial[name]} required={required} />
    </div>
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {field("firstName")}
      {field("lastName")}
      {field("email", "email")}
      {field("phone", "tel", false)}
      {field("birthDate", "date", false)}
      {field("cardNumber")}
      {field("issueDate", "date")}
      {field("expiryDate", "date")}
      {state && !state.ok && <div className="sm:col-span-2"><ViolationList violations={state.violations} /></div>}
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{tc("save")}</Button></div>
    </form>
  );
}
