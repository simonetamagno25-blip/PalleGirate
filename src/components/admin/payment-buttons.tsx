"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { setNoShowAction, setPaymentAction, unpaidImpactAction } from "@/app/(app)/admin/payments/actions";

export function PaymentButtons({ bookingId, noShow, showNoShow = true }: { bookingId: string; noShow: boolean; showNoShow?: boolean }) {
  const t = useTranslations("payments");
  const te = useTranslations("errors");
  const [pending, start] = useTransition();
  const set = (status: "PAID" | "UNPAID" | "EXEMPT") =>
    start(async () => {
      // "Non pagata" può bloccare il socio e cancellare le sue prenotazioni future: serve conferma.
      if (status === "UNPAID") {
        const { wouldBlock, futureCount } = await unpaidImpactAction(bookingId);
        if (!confirm(t("unpaidConfirm", { wouldBlock: String(wouldBlock), count: futureCount }))) return;
      }
      const r = await setPaymentAction(bookingId, status);
      if (r.ok) toast.success(t("saved"));
      else toast.error(te(r.violations[0].code));
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={pending} onClick={() => set("PAID")}>{t("paid")}</Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => set("UNPAID")}>{t("unpaid")}</Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => set("EXEMPT")}>{t("exempt")}</Button>
      {showNoShow && (
        <div className="flex items-center gap-1">
          <Switch id={`ns-${bookingId}`} defaultChecked={noShow} onCheckedChange={(v) =>
              start(async () => {
                const r = await setNoShowAction(bookingId, v);
                if (!r.ok) toast.error(te(r.violations[0].code));
              })
            } />
          <Label htmlFor={`ns-${bookingId}`} className="text-xs">{t("noShow")}</Label>
        </div>
      )}
    </div>
  );
}
