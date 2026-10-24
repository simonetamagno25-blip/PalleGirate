import { cn } from "@/lib/utils";

/*
 * Office tables: the board's grammar in daylight. Column headers in condensed caps, hairline row dividers, tabular
 * numbers, state as lamps (dot + text). On phone the same rows render as a stacked list (DenseList) instead of a
 * table that would scroll sideways.
 */

export type DenseHeader = { key: string; label?: React.ReactNode; srLabel?: string; className?: string };

const panel = "overflow-hidden rounded-lg bg-card ring-1 ring-border";

export function DenseTable({ caption, headers, children, className }: { caption: string; headers: DenseHeader[]; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(panel, "relative overflow-x-auto", className)}>
      <table className="w-full border-collapse text-base">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b">
            {headers.map((h) => (
              <th
                key={h.key}
                scope="col"
                className={cn("h-11 px-4 text-left align-middle font-display text-sm font-semibold tracking-[0.06em] whitespace-nowrap text-muted-foreground uppercase", h.className)}
              >
                {h.label ?? <span className="sr-only">{h.srLabel}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  );
}

export function DenseRow({ children, className, muted = false }: { children: React.ReactNode; className?: string; muted?: boolean }) {
  return <tr className={cn("transition-colors duration-150 hover:bg-muted/50", muted && "text-muted-foreground", className)}>{children}</tr>;
}

export function DenseCell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-2.5 align-middle", className)}>{children}</td>;
}

/** Phone rendering of the same rows: one bordered list, one item per row. */
export function DenseList({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <ul aria-label={label} className={cn(panel, "divide-y", className)}>
      {children}
    </ul>
  );
}

export function DenseListItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <li className={cn("space-y-2 px-4 py-3.5", className)}>{children}</li>;
}

/** Start time in the board's condensed figures, end time and day underneath. */
export function When({ time, end, day }: { time: string; end?: string; day: string }) {
  return (
    <span className="block whitespace-nowrap">
      <span className="font-display text-xl leading-tight font-bold">{time}</span>
      {end && <span className="text-muted-foreground">{"–" + end}</span>}
      <span className="block text-[0.9375rem] text-muted-foreground">{day}</span>
    </span>
  );
}

/** The note for an empty list, with an optional action that moves the work forward. */
export function EmptyState({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn(panel, "flex flex-col items-start gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between", className)}>
      <p className="text-base text-muted-foreground">{children}</p>
      {action}
    </div>
  );
}
