"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chartAxis, chartTooltip } from "./chart-style";

export function BarChartCard({ title, data, xKey, yKey, empty, color = "var(--chart-1)", valueLabel }: { title: string; data: Record<string, string | number>[]; xKey: string; yKey: string; empty: string; color?: string; valueLabel?: string }) {
  const hasData = data.some((d) => Number(d[yKey]) > 0);
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="h-64">
        {!hasData ? (
          <p className="grid h-full place-items-center rounded-md border border-dashed text-base text-muted-foreground">{empty}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -16, right: 4, top: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey={xKey} {...chartAxis} />
              <YAxis {...chartAxis} allowDecimals={false} />
              <Tooltip
                formatter={(value) => [typeof value === "number" ? Math.round(value * 10) / 10 : value, valueLabel ?? yKey]}
                cursor={{ fill: "var(--muted)" }}
                {...chartTooltip}
              />
              <Bar dataKey={yKey} fill={color} radius={[3, 3, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
