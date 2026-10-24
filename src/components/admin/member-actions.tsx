"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ViolationList } from "@/components/common/violation-list";
import type { Violation } from "@/lib/booking-rules";
import { renewAction, resetAccessAction, setAdminAction } from "@/app/(app)/admin/members/actions";

export function MemberActions({ userId, isAdmin, proposedExpiry, hasMembership }: { userId: string; isAdmin: boolean; proposedExpiry: string | null; hasMembership: boolean }) {
  const t = useTranslations("members");
  const router = useRouter();
  const [expiry, setExpiry] = useState(proposedExpiry ?? "");
  const [errors, setErrors] = useState<Violation[]>([]);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; violations?: Violation[] }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setErrors([]);
        toast.success(t("saved"));
        router.refresh();
      } else setErrors(r.violations ?? []);
    });
  return (
    <div className="space-y-4">
      {hasMembership && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t("renewHint", { date: proposedExpiry ?? "" })}</p>
            <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-44" />
          </div>
          <Button disabled={pending} onClick={() => run(() => renewAction(userId, expiry))}>{t("renew")}</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {hasMembership && (
          <Button variant="outline" disabled={pending} onClick={() => confirm(t("resetConfirm")) && run(() => resetAccessAction(userId))}>{t("resetAccess")}</Button>
        )}
        <Button variant="outline" disabled={pending} onClick={() => run(() => setAdminAction(userId, !isAdmin))}>{isAdmin ? t("removeAdmin") : t("makeAdmin")}</Button>
      </div>
      {errors.length > 0 && <ViolationList violations={errors} />}
    </div>
  );
}
