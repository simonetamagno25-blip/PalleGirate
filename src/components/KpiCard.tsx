import type { ReactNode } from 'react'

/** Indicatore (KPI): etichetta, numero grande in carattere sportivo e una riga di contesto opzionale. */
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
  const warning = tone === 'warning'
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm ${warning ? 'border-destructive/50' : ''}`}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${warning ? 'bg-destructive' : 'bg-accent'}`} />
      <p className="pl-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className={`mt-1 pl-1 font-heading text-3xl font-extrabold sm:text-4xl tabular-nums ${warning ? 'text-destructive' : ''}`}>{value}</p>
      {hint && <p className="mt-1 pl-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
