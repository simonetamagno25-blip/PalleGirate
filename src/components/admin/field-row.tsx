"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { futureCountAction, saveFieldAction, toggleFieldAction } from "@/app/(app)/admin/settings/actions";

export type FieldRowValue = { id: string | null; name: string; sport: string; slotMinutes: number; priceCents: number; sortOrder: number; active: boolean };
const SPORTS = ["FOOTBALL", "TENNIS", "BASKETBALL", "BOCCE"] as const;

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
  return (
    <div className="grid grid-cols-2 items-end gap-2 border-b py-3 last:border-0 sm:grid-cols-[2fr_1.5fr_1fr_1fr_0.7fr_auto]">
      <Input aria-label={t("name")} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      <select aria-label={t("sport")} className="h-9 rounded-md border bg-background px-2 text-sm" value={v.sport} onChange={(e) => setV({ ...v, sport: e.target.value })}>
        {SPORTS.map((s) => <option key={s} value={s}>{t(`sports.${s}`)}</option>)}
      </select>
      <Input aria-label={t("slotMinutes")} type="number" step={15} value={v.slotMinutes} onChange={(e) => setV({ ...v, slotMinutes: Number(e.target.value) })} />
      <Input aria-label={t("price")} inputMode="decimal" value={v.priceEuro} onChange={(e) => setV({ ...v, priceEuro: e.target.value })} />
      <Input aria-label={t("sortOrder")} type="number" value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value) })} />
      <div className="flex gap-1">
        <Button size="sm" disabled={pending} onClick={save}>{tc("save")}</Button>
        {field.id && <Button size="sm" variant="outline" disabled={pending} onClick={toggle}>{field.active ? t("deactivate") : t("activate")}</Button>}
      </div>
    </div>
  );
}
