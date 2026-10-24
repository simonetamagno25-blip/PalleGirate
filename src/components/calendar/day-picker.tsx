"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays } from "@/lib/time/rome";

/** Desktop day controls: previous/next day, a date field for any day, and a jump back to today. */
export function DayPicker({ day, today }: { day: string; today: string }) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const href = (d: string) => `/calendar?day=${d}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" asChild><Link href={href(addDays(day, -1))} aria-label={t("prev")}><ChevronLeft aria-hidden /></Link></Button>
      <Input type="date" aria-label={t("days")} value={day} onChange={(e) => e.target.value && router.push(href(e.target.value))} className="w-48" />
      <Button variant="outline" size="icon" asChild><Link href={href(addDays(day, 1))} aria-label={t("next")}><ChevronRight aria-hidden /></Link></Button>
      {day !== today && <Button variant="ghost" asChild><Link href={href(today)}>{t("today")}</Link></Button>}
    </div>
  );
}
