"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { minutesToHHMM } from "@/lib/time/rome";
import type { DayAvailability } from "@/server/availability";

export function DayGrid({ availability, rows, selectedField, isAdmin }: { availability: DayAvailability; rows: number[]; selectedField?: string; isAdmin: boolean }) {
  const t = useTranslations("calendar");
  const { fields, bookings, day } = availability;
  const at = (fieldId: string, minute: number) => bookings.find((b) => b.fieldId === fieldId && b.startMin <= minute && minute < b.endMin);
  const hideOnMobile = (id: string) => (id === selectedField ? "" : "hidden md:table-cell");
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-card">
          <tr>
            <th className="w-16 p-2 text-left font-medium">{t("time")}</th>
            {fields.map((f) => <th key={f.id} className={cn("p-2 text-left font-medium", hideOnMobile(f.id))}>{f.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((minute) => (
            <tr key={minute} className={minute % 60 === 0 ? "border-t" : ""}>
              <td className="p-1 pl-2 align-top text-xs tabular-nums text-muted-foreground">{minute % 60 === 0 ? minutesToHHMM(minute) : ""}</td>
              {fields.map((f) => {
                const b = at(f.id, minute);
                const first = b && b.startMin === minute;
                if (b) {
                  const label = isAdmin ? b.memberName : b.mine ? t("mine") : t("busy");
                  return (
                    <td key={f.id} className={cn("h-6 px-2 text-xs", hideOnMobile(f.id), b.mine ? "bg-primary/80 text-primary-foreground" : "bg-muted-foreground/25")}>
                      {first ? label : ""}
                    </td>
                  );
                }
                return (
                  <td key={f.id} className={cn("h-6 p-0", hideOnMobile(f.id))}>
                    <Link
                      href={`/book?field=${f.id}&day=${day}&time=${minute}`}
                      className="block h-full w-full hover:bg-emerald-500/20 focus-visible:bg-emerald-500/30"
                      aria-label={`${f.name} ${minutesToHHMM(minute)} ${t("free")}`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
