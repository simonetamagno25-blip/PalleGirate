"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ViolationList } from "@/components/common/violation-list";
import { activateAction } from "./actions";

export function ActivateForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [state, action, pending] = useActionState(activateAction, null);
  useEffect(() => {
    if (state?.ok) router.replace("/login");
  }, [state, router]);
  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4 rounded-lg bg-card p-5 ring-1 ring-border">
        <div className="space-y-2">
          <Label htmlFor="cardNumber">{t("cardNumber")}</Label>
          <Input id="cardNumber" name="cardNumber" autoComplete="off" autoCapitalize="characters" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("newPassword")}</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        {state && !state.ok && <ViolationList violations={state.violations} />}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>{t("activate")}</Button>
      </form>
      <p className="text-base"><Link className="font-medium text-amber-ink underline underline-offset-4 hover:no-underline" href="/login">{t("haveAccount")}</Link></p>
    </div>
  );
}
