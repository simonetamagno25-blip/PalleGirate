"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ViolationList } from "@/components/common/violation-list";
import type { Violation } from "@/lib/booking-rules";
import { renewAction, resetAccessAction, setAdminAction } from "@/app/(app)/admin/members/actions";

export function MemberActions({ userId, isAdmin, proposedExpiry, proposedLabel, hasMembership }: { userId: string; isAdmin: boolean; proposedExpiry: string | null; proposedLabel?: string; hasMembership: boolean }) {
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
    <div className="space-y-5">
      {hasMembership && (
        <div className="space-y-1.5">
          <Label htmlFor={`renew-${userId}`}>{t("newExpiry")}</Label>
          <div className="flex flex-wrap gap-2">
            <Input id={`renew-${userId}`} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} aria-describedby={`renew-hint-${userId}`} className="w-44" />
            <Button disabled={pending} onClick={() => run(() => renewAction(userId, expiry))}>{t("renew")}</Button>
          </div>
          <p id={`renew-hint-${userId}`} className="text-[0.9375rem] text-muted-foreground">{t("renewHint", { date: proposedLabel ?? proposedExpiry ?? "" })}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 border-t pt-4">
        {hasMembership && (
          <Button variant="outline" disabled={pending} onClick={() => confirm(t("resetConfirm")) && run(() => resetAccessAction(userId))}>{t("resetAccess")}</Button>
        )}
        <Button variant="outline" disabled={pending} onClick={() => run(() => setAdminAction(userId, !isAdmin))}>{isAdmin ? t("removeAdmin") : t("makeAdmin")}</Button>
      </div>
      {errors.length > 0 && <ViolationList violations={errors} />}
    </div>
  );
}
