"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ViolationList } from "@/components/violation-list";
import type { Violation } from "@/lib/booking-rules";
import { cancelBookingAction } from "@/app/(app)/book/actions";

export function CancelButton({ bookingId, mode, defaultReason = "" }: { bookingId: string; mode: "member" | "admin"; defaultReason?: string }) {
  const t = useTranslations("bookings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(defaultReason);
  const [errors, setErrors] = useState<Violation[]>([]);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">{t("cancel")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("cancelTitle")}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`reason-${bookingId}`}>{t("reason")}</Label>
          <Textarea id={`reason-${bookingId}`} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
        </div>
        {errors.length > 0 && <ViolationList violations={errors} />}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{tc("back")}</Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await cancelBookingAction({ bookingId, reason, mode });
                if (r.ok) {
                  toast.success(t("done"));
                  setOpen(false);
                  router.refresh();
                } else setErrors(r.violations);
              })
            }
          >
            {tc("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
