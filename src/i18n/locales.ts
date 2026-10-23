export const LOCALES = ["it", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "locale";
export const toLocale = (value: string | undefined | null): Locale => (value === "en" ? "en" : "it");
