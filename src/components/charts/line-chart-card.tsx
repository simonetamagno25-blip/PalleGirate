"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { chartAxis, chartTooltip } from "./chart-style";

export function LineChartCard({ title, data, empty, valueLabel }: { title: string; data: { label: string; count: number }[]; empty: string; valueLabel?: string }) {
  return (
    <Card>
      <CardHeader><h2 className="text-lg leading-snug font-semibold">{title}</h2></CardHeader>
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
                cursor={{ stroke: "var(--input)" }}
                {...chartTooltip} />
              {/* Monthly counts: straight segments and a dot per month, no smoothing that invents values in between. */}
              <Line type="linear" dataKey="count" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
