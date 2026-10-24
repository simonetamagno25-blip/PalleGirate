/** Shared Recharts styling so every chart reads from the theme tokens (axis text ≥4.5:1, hairline grid). */
export const chartAxis = {
  tickLine: false,
  axisLine: false,
  fontSize: 14,
  tick: { fill: "var(--muted-foreground)" },
} as const;

export const chartTooltip = {
  contentStyle: { background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 15 },
  labelStyle: { color: "var(--popover-foreground)", fontWeight: 600 },
  itemStyle: { color: "var(--popover-foreground)" },
} as const;
