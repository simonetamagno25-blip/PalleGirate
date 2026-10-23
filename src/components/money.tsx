"use client";

import { useFormatter } from "next-intl";

export function Money({ cents }: { cents: number }) {
  const format = useFormatter();
  return <>{format.number(cents / 100, { style: "currency", currency: "EUR" })}</>;
}
