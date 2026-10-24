"use client";

import { useFormatter, useTranslations } from "next-intl";

/** I parametri sono salvati grezzi (ISO, YYYY-MM-DD) e vengono formattati nella lingua di chi legge. */
export function NotificationText({ type, params }: { type: string; params: Record<string, string | number> }) {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const p: Record<string, string | number> = { ...params };
  if (typeof p.start === "string") p.start = format.dateTime(new Date(p.start), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  if (typeof p.expiry === "string") p.expiry = format.dateTime(new Date(`${p.expiry}T12:00:00Z`), { dateStyle: "medium" });
  return (
    <>
      {t(type as "BOOKING_CREATED", p)}
      {params.by === "admin" && t("byAdmin")}
      {params.reason && <> {t("reason", { reason: String(params.reason) })}</>}
      {params.chargeable === 1 && <> {t("chargeable")}</>}
    </>
  );
}
