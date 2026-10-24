"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { LOCALES } from "@/i18n/locales";
import { setLocaleAction } from "@/app/(app)/locale-actions";

export function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={t("language")}
      disabled={pending}
      value={locale}
      onChange={(e) => start(() => setLocaleAction(e.target.value))}
      className="h-9 rounded-md border bg-background px-2 text-sm uppercase"
    >
      {LOCALES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
    </select>
  );
}
