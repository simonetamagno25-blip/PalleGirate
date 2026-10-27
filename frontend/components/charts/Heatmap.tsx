/** Heatmap giorno della settimana × ora: griglia CSS, intensità proporzionale al massimo (nessuna libreria). */
export function Heatmap({
  rows,
  hours,
  counts,
  cellLabel,
}: {
  /** Etichette dei 7 giorni, dal lunedì. */
  rows: string[]
  hours: number[]
  /** Chiave `${weekdayIndex}-${hour}` → numero di prenotazioni. */
  counts: Record<string, number>
  cellLabel: (row: string, hour: number, count: number) => string
}) {
  const max = Math.max(1, ...Object.values(counts))
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[28rem] gap-1" style={{ gridTemplateColumns: `3rem repeat(${hours.length}, minmax(0, 1fr))` }}>
        <span />
        {hours.map((h) => (
          <span key={h} className="text-center text-[10px] text-muted-foreground">
            {h}
          </span>
        ))}
        {rows.map((row, wd) => (
          <div key={row} className="contents">
            <span className="self-center text-xs text-muted-foreground">{row}</span>
            {hours.map((h) => {
              const count = counts[`${wd}-${h}`] ?? 0
              return (
                <span
                  key={h}
                  title={cellLabel(row, h, count)}
                  aria-label={cellLabel(row, h, count)}
                  className="aspect-square rounded-sm border border-border/50"
                  style={{ background: count === 0 ? 'transparent' : `color-mix(in oklab, var(--chart-1) ${Math.round(15 + (count / max) * 85)}%, transparent)` }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
