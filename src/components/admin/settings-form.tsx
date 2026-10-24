"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/common/native-select";
import { ViolationList } from "@/components/common/violation-list";
import { minutesToHHMM } from "@/lib/time/rome";
import { saveSettingsAction } from "@/app/(app)/admin/settings/actions";

type S = { openMinutes: number; closeMinutes: number; startStepMinutes: number; maxAdvanceDays: number; maxActiveBookings: number; changeWindowMinutes: number; maxSlotsPerBooking: number; membershipWarningDays: number; reminderHours: number };

// L'occupazione è a quarti d'ora: i passi validi sono 15, 30, 60 (come START_STEPS lato server).
const STEPS = [15, 30, 60];

/** The booking rules in three labelled groups: opening hours, limits per member, reminders. */
export function SettingsForm({ settings }: { settings: S }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(saveSettingsAction, null);
  useEffect(() => {
    if (state?.ok) toast.success(t("saved"));
  }, [state, t]);
  const num = (k: Exclude<keyof S, "openMinutes" | "closeMinutes" | "startStepMinutes">) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{t(k)}</Label>
      <Input id={k} name={k} type="number" inputMode="numeric" defaultValue={settings[k]} required />
    </div>
  );
  const group = (legend: string, children: React.ReactNode, first = false) => (
    <div className={first ? undefined : "border-t pt-5"}>
      <fieldset>
        <legend className="mb-3 text-base font-semibold">{legend}</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      </fieldset>
    </div>
  );
  return (
    <form action={action} className="space-y-6">
      {group(
        t("groupHours"),
        <>
          <div className="space-y-1.5">
            <Label htmlFor="openMinutes">{t("openMinutes")}</Label>
            <Input id="openMinutes" name="openMinutes" type="time" step={900} defaultValue={minutesToHHMM(settings.openMinutes)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="closeMinutes">{t("closeMinutes")}</Label>
            <Input id="closeMinutes" name="closeMinutes" type="time" step={900} defaultValue={minutesToHHMM(settings.closeMinutes % 1440)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="startStepMinutes">{t("startStepMinutes")}</Label>
            <NativeSelect id="startStepMinutes" name="startStepMinutes" defaultValue={settings.startStepMinutes}>
              {STEPS.map((n) => <option key={n} value={n}>{n}</option>)}
            </NativeSelect>
          </div>
        </>,
        true,
      )}
      {group(
        t("groupLimits"),
        <>
          {num("maxAdvanceDays")}
          {num("maxActiveBookings")}
          {num("maxSlotsPerBooking")}
          {num("changeWindowMinutes")}
        </>,
      )}
      {group(
        t("groupNotices"),
        <>
          {num("membershipWarningDays")}
          {num("reminderHours")}
        </>,
      )}
      {state && !state.ok && <ViolationList violations={state.violations} />}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">{tc("save")}</Button>
    </form>
  );
}
