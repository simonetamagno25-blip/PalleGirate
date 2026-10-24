"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HourHeatmap({ title, cells, fromHour, toHour, weekdayLabels }: { title: string; cells: { weekday: number; hour: number; count: number }[]; fromHour: number; toHour: number; weekdayLabels: string[] }) {
  const t = useTranslations("adminDashboard");
  const max = Math.max(1, ...cells.map((c) => c.count));
  const hours = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i);
  const get = (w: number, h: number) => cells.find((c) => c.weekday === w && c.hour === h)?.count ?? 0;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="border-separate border-spacing-0.5 text-[10px]">
          <thead>
            <tr><th />{hours.map((h) => <th key={h} className="w-6 font-normal text-muted-foreground">{h}</th>)}</tr>
          </thead>
          <tbody>
            {weekdayLabels.map((label, w) => (
              <tr key={label}>
                <th className="pr-1 text-left font-normal text-muted-foreground">{label}</th>
                {hours.map((h) => {
                  const c = get(w, h);
                  return (
                    <td key={h} title={t("heatCell", { day: label, hour: h, count: c })} className="size-6 rounded-sm" style={{ background: c ? `color-mix(in oklab, var(--chart-1) ${Math.round((c / max) * 90) + 10}%, transparent)` : "var(--muted)" }} />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
