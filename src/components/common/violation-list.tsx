"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Violation } from "@/lib/booking-rules";

/** Traduce i codici di violazione restituiti dal server. I parametri "YYYY-MM-DD" vengono formattati come date. */
export function ViolationList({ violations }: { violations: Violation[] }) {
  const t = useTranslations("errors");
  const format = useFormatter();
  const fmt = (v: string | number) =>
    typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? format.dateTime(new Date(`${v}T12:00:00Z`), { dateStyle: "medium" }) : v;
  return (
    <Alert variant="destructive">
      <AlertDescription>
        <ul className="list-disc space-y-1 pl-4">
          {violations.map((v, i) => (
            <li key={i}>{t(v.code, Object.fromEntries(Object.entries(v.params ?? {}).map(([k, x]) => [k, fmt(x)])))}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
