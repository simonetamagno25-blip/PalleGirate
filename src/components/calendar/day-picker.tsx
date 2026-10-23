"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays } from "@/lib/time/rome";

export function DayPicker({ day, today, fields, selectedField }: { day: string; today: string; fields: { id: string; name: string }[]; selectedField?: string }) {
  const t = useTranslations("calendar");
  const format = useFormatter();
  const router = useRouter();
  const href = (d: string, f = selectedField) => `/calendar?day=${d}${f ? `&field=${f}` : ""}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" asChild aria-label={t("prev")}><Link href={href(addDays(day, -1))}><ChevronLeft /></Link></Button>
      <Input type="date" value={day} onChange={(e) => e.target.value && router.push(href(e.target.value))} className="w-44" />
      <Button variant="outline" size="icon" asChild aria-label={t("next")}><Link href={href(addDays(day, 1))}><ChevronRight /></Link></Button>
      {day !== today && <Button variant="ghost" asChild><Link href={href(today)}>{t("today")}</Link></Button>}
      <span className="text-sm font-medium">{format.dateTime(new Date(`${day}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long" })}</span>
      {/* Su telefono si vede un campo alla volta. */}
      <select
        aria-label={t("field")}
        className="h-9 rounded-md border bg-background px-2 text-sm md:hidden"
        value={selectedField}
        onChange={(e) => router.push(href(day, e.target.value))}
      >
        {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
    </div>
  );
}
