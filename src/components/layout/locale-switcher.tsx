"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { LOCALES } from "@/i18n/locales";
import { setLocaleAction } from "@/app/(app)/locale-actions";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ onBoard = false }: { onBoard?: boolean }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={t("language")}
      disabled={pending}
      value={locale}
      onChange={(e) => start(() => setLocaleAction(e.target.value))}
      className={cn(
        "h-11 cursor-pointer rounded-md border px-2.5 text-base font-medium",
        onBoard ? "border-flap-seam bg-board text-flap-ink hover:bg-flap" : "border-input bg-card text-foreground",
      )}
    >
      {LOCALES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
    </select>
  );
}
