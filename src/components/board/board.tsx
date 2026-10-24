import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Board primitives: the black departures-board panel and its cells. The board is black in both themes;
 * inside it rows are separated by 1px seams, never shadows. Used by home, calendar, booking wizard and bookings.
 */

const DASH = "—";

/** Secondary button on a board (e.g. Modifica). */
export const boardButton =
  "border-flap-seam bg-flap text-flap-ink hover:bg-[#222222] hover:text-flap-ink aria-expanded:bg-[#222222] aria-expanded:text-flap-ink";
/** Quiet outline button on a board, for the separated destructive action (e.g. Cancella). */
export const boardOutlineButton =
  "border-flap-seam bg-transparent text-flap-ink hover:border-lamp-red-board hover:bg-transparent hover:text-lamp-red-board aria-expanded:bg-transparent aria-expanded:text-flap-ink";

export function Board({
  id,
  title,
  meta,
  children,
  className,
}: {
  id?: string;
  title?: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={title && id ? id : undefined} className={cn("board-surface rounded-lg p-4 ring-1 ring-flap-seam md:p-5", className)}>
      {(title || meta) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {title && <h2 id={id} className="text-lg font-semibold text-flap-ink">{title}</h2>}
          {meta && <div className="text-[0.9375rem] text-flap-ink-muted">{meta}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Semantic table on the board. Column headers are the one place outside court names where condensed caps appear. */
export function BoardTable({
  caption,
  headers,
  children,
  className,
}: {
  caption: string;
  headers: { key: string; label: React.ReactNode; className?: string }[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <table className={cn("w-full border-collapse", className)}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h.key} scope="col" className={cn("pb-2 text-left font-display text-sm font-semibold tracking-[0.06em] text-flap-ink-muted uppercase", h.className)}>
              {h.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function BoardRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("border-t border-flap-seam", className)}>{children}</tr>;
}

/** Court name as the row header: condensed caps, the board's own voice. */
export function BoardRowHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="row" className={cn("py-2 pr-3 text-left align-middle font-display text-lg leading-tight font-bold tracking-[0.03em] text-flap-ink uppercase", className)}>
      {children}
    </th>
  );
}

export function BoardCell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("h-14 py-1.5 align-middle", className)}>{children}</td>;
}

const cell = "flap-face inline-flex h-11 min-w-16 shrink-0 items-center justify-center px-2.5 font-display text-xl leading-none font-bold";

/** A free start time: a flap cell that links to the booking wizard (44px target). */
export function FlapLink({ href, time, label, className }: { href: string; time: string; label: string; className?: string }) {
  return (
    <Link href={href} aria-label={label} className={cn(cell, "transition-colors duration-150 hover:bg-[#262626] hover:text-lamp-amber", className)}>
      {time}
    </Link>
  );
}

/** A free start time as a button (booking wizard). Selected = amber with a check, never color alone. */
export function FlapButton({
  time,
  selected,
  onClick,
  label,
  className,
}: {
  time: string;
  selected: boolean;
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
      className={cn(
        cell,
        "w-full gap-0.5 transition-colors duration-150",
        selected ? "bg-lamp-amber text-[#111111] after:hidden" : "hover:bg-[#262626] hover:text-lamp-amber",
        className,
      )}
    >
      {selected && <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden />}
      {time}
    </button>
  );
}

/** Your booking: amber cell with a check icon and the word "Tua"/"Yours". */
export function FlapMine({ time, mineLabel, href, label, className }: { time: string; mineLabel: string; href?: string; label: string; className?: string }) {
  const content = (
    <>
      <Check className="size-4 shrink-0" strokeWidth={3} aria-hidden />
      <span aria-hidden>{time}</span>
      <span aria-hidden className="font-sans text-sm font-semibold">{mineLabel}</span>
      <span className="sr-only">{label}</span>
    </>
  );
  const cls = cn(cell, "gap-1.5 bg-lamp-amber text-[#111111] after:hidden", className);
  return href ? (
    <Link href={href} className={cn(cls, "hover:bg-[color-mix(in_oklch,var(--lamp-amber),#000_10%)]")}>{content}</Link>
  ) : (
    <span className={cls}>{content}</span>
  );
}

/** A taken time: a dim, empty flap with a dash; the reason is spoken, never shown as a name to members. */
export function FlapTaken({ label, detail, className }: { label: string; detail?: string; className?: string }) {
  const spoken = detail ? label + ": " + detail : label;
  return (
    <span title={detail} className={cn(cell, "min-w-12 bg-flap/60 font-sans text-base font-normal text-flap-ink-muted after:hidden", className)}>
      <span aria-hidden>{detail ? <span className="block max-w-14 truncate text-sm">{detail}</span> : DASH}</span>
      <span className="sr-only">{spoken}</span>
    </span>
  );
}
