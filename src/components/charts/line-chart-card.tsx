"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chartAxis, chartTooltip } from "./chart-style";

export function LineChartCard({ title, data, empty, valueLabel }: { title: string; data: { label: string; count: number }[]; empty: string; valueLabel?: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="h-64">
        {data.every((d) => d.count === 0) ? (
          <p className="grid h-full place-items-center rounded-md border border-dashed text-base text-muted-foreground">{empty}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: -16 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" {...chartAxis} />
              <YAxis {...chartAxis} allowDecimals={false} />
              <Tooltip
                formatter={(value) => [typeof value === "number" ? Math.round(value * 10) / 10 : value, valueLabel ?? "count"]}
                {...chartTooltip} />
              <Line type="monotone" dataKey="count" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
