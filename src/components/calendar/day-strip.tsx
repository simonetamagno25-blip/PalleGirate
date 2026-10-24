"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Horizontal strip of bookable days (today … today + horizon) as flap date tiles. Today reads "Oggi" in words, the
 * selected day has amber ink and an amber outline. Works as links (calendar: `basePath`) or as buttons (wizard: `onSelect`).
 */
export function DayStrip({
  days,
  selected,
  today,
  basePath,
  onSelect,
}: {
  days: string[];
  selected: string;
  today: string;
  basePath?: string;
  onSelect?: (day: string) => void;
}) {
  const t = useTranslations("calendar");
  const format = useFormatter();
  const scroller = useRef<HTMLUListElement>(null);

  // Keep the selected day in view without scrolling the page vertically. The strip bleeds to the screen edge on
  // phone but keeps the page gutter as padding and scroll-padding, so snapping never parks a day against the edge.
  useEffect(() => {
    const list = scroller.current;
    const el = list?.querySelector<HTMLElement>("[data-selected=true]");
    if (!list || !el) return;
    list.scrollLeft = el.offsetLeft - list.clientWidth / 2 + el.clientWidth / 2;
  }, [selected]);

  return (
    <ul ref={scroller} aria-label={t("days")} className="relative -mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pt-0.5 pb-2 [scrollbar-width:thin] md:mx-0 md:scroll-px-0.5 md:px-0.5">
      {days.map((d) => {
        const date = new Date(`${d}T12:00:00Z`);
        const isSelected = d === selected;
        const isToday = d === today;
        // A flap-style date tile: board face in both themes. Selected = amber ink and an amber outline; today says "Oggi".
        const cls = cn(
          "flex h-16 w-14 shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-sm bg-flap transition-colors duration-150",
          isSelected ? "text-lamp-amber ring-2 ring-lamp-amber ring-inset" : "text-flap-ink ring-1 ring-board-edge ring-inset hover:bg-[#262828]",
        );
        const content = (
          <>
            <span className={cn("text-sm leading-none", isSelected ? "text-lamp-amber" : "text-flap-ink-muted", isToday && "font-semibold")}>
              {isToday ? t("today") : format.dateTime(date, { weekday: "short" })}
            </span>
            <span className="font-display text-2xl leading-none font-bold">{format.dateTime(date, { day: "numeric" })}</span>
            {isToday && <span className="sr-only">{format.dateTime(date, { weekday: "long" })}</span>}
            <span className="sr-only">{format.dateTime(date, { month: "long" })}</span>
          </>
        );
        return (
          <li key={d} data-selected={isSelected}>
            {basePath !== undefined ? (
              <Link href={`${basePath}${d}`} aria-current={isSelected ? "date" : undefined} className={cls}>{content}</Link>
            ) : (
              <button type="button" aria-pressed={isSelected} onClick={() => onSelect?.(d)} className={cls}>{content}</button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
