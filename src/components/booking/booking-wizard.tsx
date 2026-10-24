"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/common/money";
import { ViolationList } from "@/components/common/violation-list";
import type { Violation } from "@/lib/booking-rules";
import type { FreeStart } from "@/lib/calendar/free-starts";
import { minutesToHHMM } from "@/lib/time/rome";
import { cn } from "@/lib/utils";
import { freeStartsAction, submitBookingAction } from "@/app/(app)/book/actions";

export type WizardField = { id: string; name: string; slotMinutes: number; priceCents: number };

export function BookingWizard(props: {
  fields: WizardField[];
  initial: { fieldId?: string; day: string; minute?: number; slots?: number };
  minDay: string;
  maxDay?: string;
  maxSlots: number;
  mode: "member" | "admin";
  bookingId?: string;
  members?: { id: string; name: string }[];
}) {
  const t = useTranslations("wizard");
  const format = useFormatter();
  const router = useRouter();
  const [fieldId, setFieldId] = useState(props.initial.fieldId ?? props.fields[0]?.id ?? "");
  const [day, setDay] = useState(props.initial.day);
  const [minute, setMinute] = useState<number | undefined>(props.initial.minute);
  const [slots, setSlots] = useState(props.initial.slots ?? 1);
  const [memberId, setMemberId] = useState(props.members?.[0]?.id);
  const [starts, setStarts] = useState<FreeStart[]>([]);
  const [errors, setErrors] = useState<Violation[]>([]);
  const [loading, startLoading] = useTransition();
  const [submitting, startSubmit] = useTransition();

  const field = props.fields.find((f) => f.id === fieldId);
  const chosen = starts.find((s) => s.minute === minute);

  const key = `${fieldId}|${day}`;
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    startLoading(async () => {
      setStarts(await freeStartsAction({ fieldId, day, excludeBookingId: props.bookingId, mode: props.mode }));
      setLoadedFor(`${fieldId}|${day}`);
    });
  }, [fieldId, day, props.bookingId, props.mode]);

  // Se l'orario scelto non è libero per il campo e il giorno appena caricati, si toglie la selezione.
  // Prima del primo caricamento non si tocca nulla, così l'orario arrivato dal calendario resta selezionato.
  useEffect(() => {
    if (loadedFor !== key) return;
    if (minute !== undefined && !starts.some((s) => s.minute === minute)) setMinute(undefined);
    if (chosen && slots > chosen.maxSlots) setSlots(chosen.maxSlots);
  }, [loadedFor, key, starts, minute, chosen, slots]);

  const submit = () =>
    startSubmit(async () => {
      if (minute === undefined) return;
      const r = await submitBookingAction({ bookingId: props.bookingId, memberId, mode: props.mode, fieldId, day, minute, slots });
      if (r.ok) {
        toast.success(props.bookingId ? t("doneEdit") : t("done"));
        router.push(props.mode === "admin" ? "/admin/bookings" : "/bookings");
      } else {
        setErrors(r.violations);
        setStarts(await freeStartsAction({ fieldId, day, excludeBookingId: props.bookingId, mode: props.mode }));
      }
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        {props.members && (
          <Card>
            <CardHeader><CardTitle className="text-base">{t("member")}</CardTitle></CardHeader>
            <CardContent>
              <select className="h-9 w-full rounded-md border bg-background px-2" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                {props.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle className="text-base">{t("stepField")}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {props.fields.map((f) => (
              <Button key={f.id} variant={f.id === fieldId ? "default" : "outline"} onClick={() => setFieldId(f.id)}>{f.name}</Button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("stepDay")}</CardTitle></CardHeader>
          <CardContent>
            <Input type="date" value={day} min={props.minDay} max={props.maxDay} onChange={(e) => e.target.value && setDay(e.target.value)} className="w-44" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("stepTime")}</CardTitle></CardHeader>
          <CardContent>
            {!loading && starts.length === 0 && <p className="text-sm text-muted-foreground">{t("noTimes")}</p>}
            <div className={cn("grid grid-cols-4 gap-2 sm:grid-cols-6", loading && "opacity-50")}>
              {starts.map((s) => (
                <Button key={s.minute} size="sm" variant={s.minute === minute ? "default" : "outline"} className="tabular-nums" onClick={() => setMinute(s.minute)}>
                  {minutesToHHMM(s.minute)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("stepDuration")}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {field &&
              Array.from({ length: props.maxSlots }, (_, i) => i + 1).map((n) => (
                <Button key={n} variant={n === slots ? "default" : "outline"} disabled={!chosen || n > chosen.maxSlots} onClick={() => setSlots(n)}>
                  {t("slots", { count: n, minutes: n * field.slotMinutes })}
                </Button>
              ))}
          </CardContent>
        </Card>
      </div>
      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader><CardTitle className="text-base">{t("stepSummary")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {field && minute !== undefined && (
            <>
              <p className="text-sm">
                {t("summary", {
                  field: field.name,
                  date: format.dateTime(new Date(`${day}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long" }),
                  from: minutesToHHMM(minute),
                  to: minutesToHHMM(minute + slots * field.slotMinutes),
                })}
              </p>
              <p className="text-2xl font-semibold"><span className="sr-only">{t("price")}</span><Money cents={field.priceCents * slots} /></p>
            </>
          )}
          {errors.length > 0 && <ViolationList violations={errors} />}
          <Button className="w-full" disabled={minute === undefined || submitting} onClick={submit}>
            {props.bookingId ? t("confirmEdit") : t("confirm")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
