'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type BarDatum = { label: string; value: number }

/**
 * Grafico a barre generico per le dashboard: etichette e valori arrivano già formattati/tradotti dal server.
 * I colori vengono dalle variabili del tema (chiaro e scuro).
 */
export function BarSeriesChart({
  data,
  seriesLabel,
  color = 'var(--chart-1)',
  valueSuffix = '',
  decimals = 0,
  height = 220,
}: {
  data: BarDatum[]
  seriesLabel: string
  color?: string
  valueSuffix?: string
  decimals?: number
  height?: number
}) {
  const fmt = (v: number) => `${v.toLocaleString(undefined, { maximumFractionDigits: decimals })}${valueSuffix}`
  return (
    <div style={{ height }} role="img" aria-label={seriesLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} interval="preserveStartEnd" />
          <YAxis
            allowDecimals={decimals > 0}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickFormatter={(v: number) => fmt(v)}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)' }}
            contentStyle={{
              background: 'var(--popover)',
              color: 'var(--popover-foreground)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v) => [fmt(Number(v)), seriesLabel]}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
