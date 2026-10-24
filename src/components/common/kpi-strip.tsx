import { cn } from "@/lib/utils";

export type Kpi = { key: string; label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "default" | "warning" | "danger" };

/**
 * Key figures as one compact strip (a definition list split by hairlines), not a row of hero-metric cards.
 * A figure that needs attention gets a lamp dot next to its value; its label already says what it is.
 */
export function KpiStrip({ items, className }: { items: Kpi[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border ring-1 ring-border lg:grid-cols-(--kpi-cols)", className)} style={{ "--kpi-cols": `repeat(${items.length}, minmax(0, 1fr))` } as React.CSSProperties}>
      {items.map((k) => (
        <div key={k.key} className="flex flex-col gap-0.5 bg-card px-4 py-3 last:odd:col-span-2 lg:last:odd:col-span-1">
          <dt className="text-[0.9375rem] leading-snug text-muted-foreground">{k.label}</dt>
          <dd className="flex items-center gap-2 font-display text-[1.75rem] leading-tight font-bold">
            {k.tone && k.tone !== "default" && (
              <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", k.tone === "danger" ? "bg-lamp-red" : "bg-amber-ink")} />
            )}
            {k.value}
          </dd>
          {k.hint && <dd className="text-sm text-muted-foreground">{k.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
