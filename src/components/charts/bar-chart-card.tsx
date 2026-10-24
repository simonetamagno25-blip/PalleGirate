"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BarChartCard({ title, data, xKey, yKey, empty, color = "var(--chart-1)", valueLabel }: { title: string; data: Record<string, string | number>[]; xKey: string; yKey: string; empty: string; color?: string; valueLabel?: string }) {
  const hasData = data.some((d) => Number(d[yKey]) > 0);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-64">
        {!hasData ? (
          <p className="grid h-full place-items-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -16 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey={xKey} tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
              <Tooltip
                formatter={(value) => [typeof value === "number" ? Math.round(value * 10) / 10 : value, valueLabel ?? yKey]}
                cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
