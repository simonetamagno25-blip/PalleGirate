"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LineChartCard({ title, data, empty, valueLabel }: { title: string; data: { label: string; count: number }[]; empty: string; valueLabel?: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-64">
        {data.every((d) => d.count === 0) ? (
          <p className="grid h-full place-items-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: -16 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
              <Tooltip
                formatter={(value) => [typeof value === "number" ? Math.round(value * 10) / 10 : value, valueLabel ?? "count"]}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="count" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
