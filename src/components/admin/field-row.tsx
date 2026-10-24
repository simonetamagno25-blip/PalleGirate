"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/common/native-select";
import { StatusLamp } from "@/components/common/status-lamp";
import { cn } from "@/lib/utils";
import { futureCountAction, saveFieldAction, toggleFieldAction } from "@/app/(app)/admin/settings/actions";

export type FieldRowValue = { id: string | null; name: string; sport: string; slotMinutes: number; priceCents: number; sortOrder: number; active: boolean };
const SPORTS = ["FOOTBALL", "TENNIS", "BASKETBALL", "BOCCE"] as const;

/** One column layout shared by the rows and the header above them (sm and up). */
const FIELD_GRID = "grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)]";

/** Column headers for the courts list: condensed caps, from sm up. On phone every input shows its own label. */
export function FieldHeader() {
  const t = useTranslations("settings");
  const th = "font-display text-sm font-semibold tracking-[0.06em] text-muted-foreground uppercase";
  return (
    <div aria-hidden className={cn(FIELD_GRID, "hidden border-b pb-2 sm:grid")}>
      <span className={th}>{t("name")}</span>
      <span className={th}>{t("sport")}</span>
      <span className={th}>{t("slotMinutes")}</span>
      <span className={th}>{t("price")}</span>
      <span className={th}>{t("sortOrder")}</span>
    </div>
  );
}

/** One court: its editable values, then its state in words (Attivo / Non attivo) and the actions. */
export function FieldRow({ field }: { field: FieldRowValue }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const initial = { ...field, priceEuro: (field.priceCents / 100).toFixed(2) };
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const r = await saveFieldAction(field.id, { name: v.name, sport: v.sport, slotMinutes: v.slotMinutes, sortOrder: v.sortOrder, priceEuro: v.priceEuro });
      if (r.ok) {
        toast.success(t("saved"));
        // La riga "aggiungi" si svuota dopo il salvataggio, per non creare doppioni al secondo click.
        if (field.id === null) setV(initial);
      } else toast.error(te(r.violations[0].code));
    });
  const toggle = () =>
    start(async () => {
      if (field.active) {
        const count = await futureCountAction(field.id!);
        if (!confirm(t("deactivateConfirm", { count }))) return;
      }
      const r = await toggleFieldAction(field.id!, !field.active);
      if (!r.ok) toast.error(te(r.violations[0].code));
    });
  const key = field.id ?? "new";
  const label = "text-[0.9375rem] sm:sr-only";
  const inactive = field.id !== null && !field.active;
  // Save lights up (amber) only when the row has changes, so five courts never show five primary buttons.
  const dirty = v.name !== initial.name || v.sport !== initial.sport || v.slotMinutes !== initial.slotMinutes || v.priceEuro !== initial.priceEuro || v.sortOrder !== initial.sortOrder;
  return (
    <div className={cn("space-y-3 py-4", inactive && "-mx-4 bg-muted/60 px-4 md:-mx-5 md:px-5")}>
      <div className={FIELD_GRID}>
        <div className="space-y-1.5">
          <Label htmlFor={`name-${key}`} className={label}>{t("name")}</Label>
          <Input id={`name-${key}`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`sport-${key}`} className={label}>{t("sport")}</Label>
          <NativeSelect id={`sport-${key}`} value={v.sport} onChange={(e) => setV({ ...v, sport: e.target.value })}>
            {SPORTS.map((s) => <option key={s} value={s}>{t(`sports.${s}`)}</option>)}
          </NativeSelect>
        </div>
        <div className="grid grid-cols-3 items-end gap-3 sm:contents">
          <div className="space-y-1.5">
            <Label htmlFor={`slot-${key}`} className={label}>{t("slotMinutes")}</Label>
            <Input id={`slot-${key}`} type="number" step={15} inputMode="numeric" value={v.slotMinutes} onChange={(e) => setV({ ...v, slotMinutes: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`price-${key}`} className={label}>{t("price")}</Label>
            <Input id={`price-${key}`} inputMode="decimal" value={v.priceEuro} onChange={(e) => setV({ ...v, priceEuro: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`order-${key}`} className={label}>{t("sortOrder")}</Label>
            <Input id={`order-${key}`} type="number" inputMode="numeric" value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value) })} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {field.id !== null &&
          (field.active ? (
            <StatusLamp tone="green" className="text-[0.9375rem]">{t("active")}</StatusLamp>
          ) : (
            <StatusLamp tone="red" className="text-[0.9375rem] font-semibold whitespace-normal">{t("inactive")}</StatusLamp>
          ))}
        <div className="ml-auto flex gap-2">
          {field.id !== null && <Button variant="outline" disabled={pending} onClick={toggle}>{field.active ? t("deactivate") : t("activate")}</Button>}
          <Button variant={dirty ? "default" : "outline"} disabled={pending || !dirty} onClick={save}>{field.id !== null ? tc("save") : t("addField")}</Button>
        </div>
      </div>
    </div>
  );
}
