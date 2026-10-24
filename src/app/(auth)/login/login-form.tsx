"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ViolationList } from "@/components/common/violation-list";
import { loginAction } from "./actions";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [state, action, pending] = useActionState(loginAction, null);
  useEffect(() => {
    if (state?.ok) router.replace("/");
  }, [state, router]);
  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4 rounded-lg bg-card p-5 ring-1 ring-border">
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("password")}</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {state && !state.ok && <ViolationList violations={state.violations} />}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>{t("login")}</Button>
      </form>
      <div className="space-y-2 text-base">
        <p><Link className="font-medium text-amber-ink underline underline-offset-4 hover:no-underline" href="/activate">{t("noAccount")}</Link></p>
        <p className="text-muted-foreground">{t("forgot")}</p>
      </div>
    </div>
  );
}
