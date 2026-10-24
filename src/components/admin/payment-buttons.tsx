"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { segmentedGroup, segmentedItem } from "@/components/common/segmented";
import { cn } from "@/lib/utils";
import { setNoShowAction, setPaymentAction, unpaidImpactAction } from "@/app/(app)/admin/payments/actions";

type Status = "PAID" | "UNPAID" | "EXEMPT";

/**
 * Payment control: Pagata / Esente as one segmented control, and Non pagata set apart on its own (it can give a
 * strike and block the member, so it never sits next to the everyday choice). The current state is pressed.
 */
export function PaymentButtons({ bookingId, noShow, showNoShow = true, current }: { bookingId: string; noShow: boolean; showNoShow?: boolean; current?: string }) {
  const t = useTranslations("payments");
  const te = useTranslations("errors");
  const [pending, start] = useTransition();
  const set = (status: Status) =>
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
  const segment = (status: Status) => {
    const on = current === status;
    return (
      <button type="button" aria-pressed={on} disabled={pending} onClick={() => set(status)} className={segmentedItem(on, "flex-1 sm:flex-none")}>
        {on && <Check className="size-4" strokeWidth={3} aria-hidden />}
        {t(status === "PAID" ? "paid" : "exempt")}
      </button>
    );
  };
  return (
    <div role="group" aria-label={t("record")} aria-busy={pending} className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className={cn(segmentedGroup, "w-full sm:w-auto")}>
        {segment("PAID")}
        {segment("EXEMPT")}
      </div>
      <Button
        variant="destructive"
        aria-pressed={current === "UNPAID"}
        disabled={pending}
        onClick={() => set("UNPAID")}
        className="aria-pressed:bg-destructive aria-pressed:text-white dark:aria-pressed:text-black"
      >
        {current === "UNPAID" && <Check className="size-4" strokeWidth={3} aria-hidden />}
        {t("unpaid")}
      </Button>
      {showNoShow && (
        <div className="flex min-h-11 items-center gap-2.5">
          <Switch
            id={`ns-${bookingId}`}
            defaultChecked={noShow}
            disabled={pending}
            onCheckedChange={(v) =>
              start(async () => {
                const r = await setNoShowAction(bookingId, v);
                if (!r.ok) toast.error(te(r.violations[0].code));
              })
            }
          />
          <Label htmlFor={`ns-${bookingId}`} className="text-[0.9375rem]">{t("noShow")}</Label>
        </div>
      )}
    </div>
  );
}
