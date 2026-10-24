import { cn } from "@/lib/utils";

export type LampTone = "green" | "red" | "amber" | "blue" | "neutral";

/** Payment state → lamp: to register amber, paid green, unpaid red, exempt blue. Shared by member and admin views. */
export const PAYMENT_TONE: Record<string, LampTone> = { PENDING: "amber", PAID: "green", UNPAID: "red", EXEMPT: "blue" };
/** Booking state → lamp: confirmed stays quiet, cancelled is red. */
export const STATUS_TONE: Record<string, LampTone> = { CONFIRMED: "neutral", CANCELLED: "red" };

const PAGE: Record<LampTone, string> = {
  green: "bg-lamp-green",
  red: "bg-lamp-red",
  amber: "bg-amber-ink",
  blue: "bg-lamp-blue",
  neutral: "bg-muted-foreground",
};
const BOARD: Record<LampTone, string> = {
  green: "bg-lamp-green-board",
  red: "bg-lamp-red-board",
  amber: "bg-lamp-amber",
  blue: "bg-lamp-blue-board",
  neutral: "bg-flap-ink-muted",
};

/** A state lamp: a small dot plus the state in words. The text always carries the meaning; the dot only reinforces it. */
export function StatusLamp({ tone, children, onBoard = false, className }: { tone: LampTone; children: React.ReactNode; onBoard?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", className)}>
      <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", onBoard ? BOARD[tone] : PAGE[tone])} />
      <span>{children}</span>
    </span>
  );
}
