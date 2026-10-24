"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ViolationList } from "@/components/common/violation-list";
import { minutesToHHMM } from "@/lib/time/rome";
import { saveSettingsAction } from "@/app/(app)/admin/settings/actions";

type S = { openMinutes: number; closeMinutes: number; startStepMinutes: number; maxAdvanceDays: number; maxActiveBookings: number; changeWindowMinutes: number; maxSlotsPerBooking: number; membershipWarningDays: number; reminderHours: number };

// L'occupazione è a quarti d'ora: i passi validi sono 15, 30, 60 (come START_STEPS lato server).
const STEPS = [15, 30, 60];

export function SettingsForm({ settings }: { settings: S }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(saveSettingsAction, null);
  useEffect(() => {
    if (state?.ok) toast.success(t("saved"));
  }, [state, t]);
  const num = (k: Exclude<keyof S, "openMinutes" | "closeMinutes" | "startStepMinutes">) => (
    <div className="space-y-1">
      <Label htmlFor={k}>{t(k)}</Label>
      <Input id={k} name={k} type="number" defaultValue={settings[k]} required />
    </div>
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-1"><Label htmlFor="openMinutes">{t("openMinutes")}</Label><Input id="openMinutes" name="openMinutes" type="time" step={900} defaultValue={minutesToHHMM(settings.openMinutes)} required /></div>
      <div className="space-y-1"><Label htmlFor="closeMinutes">{t("closeMinutes")}</Label><Input id="closeMinutes" name="closeMinutes" type="time" step={900} defaultValue={minutesToHHMM(settings.closeMinutes % 1440)} required /></div>
      <div className="space-y-1">
        <Label htmlFor="startStepMinutes">{t("startStepMinutes")}</Label>
        <select id="startStepMinutes" name="startStepMinutes" className="h-9 w-full rounded-md border bg-background px-2 text-sm" defaultValue={settings.startStepMinutes}>
          {STEPS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      {num("maxAdvanceDays")}
      {num("maxActiveBookings")}
      {num("changeWindowMinutes")}
      {num("maxSlotsPerBooking")}
      {num("membershipWarningDays")}
      {num("reminderHours")}
      {state && !state.ok && <div className="sm:col-span-3"><ViolationList violations={state.violations} /></div>}
      <div className="sm:col-span-3"><Button type="submit" disabled={pending}>{tc("save")}</Button></div>
    </form>
  );
}
