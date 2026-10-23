import type { ReactNode } from 'react'

/** Indicatore (KPI): etichetta, valore grande e una riga di contesto opzionale. */
export function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'warning'
}) {
  return (
    <div className={`rounded-xl border bg-card p-4 ${tone === 'warning' ? 'border-destructive/50' : ''}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone === 'warning' ? 'text-destructive' : ''}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
