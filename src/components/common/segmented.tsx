import { cn } from "@/lib/utils";

/*
 * Segmented control: joined 44px segments in one outline. The chosen segment is filled board black with amber text
 * (plus an amber inset ring in dark, where black on the dark card would vanish). Callers add aria-pressed or
 * aria-current, and a check icon on the chosen segment, so the state never rests on color alone.
 */
export const segmentedGroup = "inline-flex overflow-hidden rounded-md bg-card ring-1 ring-input divide-x divide-input";

export function segmentedItem(selected: boolean, className?: string) {
  return cn(
    "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 px-4 text-base font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
    selected ? "bg-board font-semibold text-lamp-amber dark:ring-2 dark:ring-lamp-amber dark:ring-inset" : "text-foreground hover:bg-muted disabled:hover:bg-card",
    className,
  );
}
