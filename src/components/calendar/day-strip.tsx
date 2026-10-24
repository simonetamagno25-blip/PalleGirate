"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Horizontal strip of bookable days (today … today + horizon). Today is outlined, the selected day is filled black
 * with amber text. Works as links (calendar: `basePath`) or as buttons (wizard: `onSelect`).
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

  // Keep the selected day in view without scrolling the page vertically.
  useEffect(() => {
    const list = scroller.current;
    const el = list?.querySelector<HTMLElement>("[data-selected=true]");
    if (!list || !el) return;
    list.scrollLeft = el.offsetLeft - list.clientWidth / 2 + el.clientWidth / 2;
  }, [selected]);

  return (
    <ul ref={scroller} aria-label={t("days")} className="relative -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pt-0.5 pb-2 [scrollbar-width:thin] md:mx-0 md:px-0.5">
      {days.map((d) => {
        const date = new Date(`${d}T12:00:00Z`);
        const isSelected = d === selected;
        const isToday = d === today;
        const cls = cn(
          "flex h-16 w-14 shrink-0 snap-start flex-col items-center justify-center rounded-md transition-colors duration-150",
          isSelected ? "bg-board text-lamp-amber ring-1 ring-flap-seam dark:ring-2 dark:ring-lamp-amber" : "bg-card text-foreground ring-1 ring-border hover:bg-accent",
          isToday && !isSelected && "ring-2 ring-foreground",
        );
        const content = (
          <>
            <span className={cn("text-sm leading-tight", isSelected ? "text-lamp-amber" : "text-muted-foreground")}>{format.dateTime(date, { weekday: "short" })}</span>
            <span className="font-display text-2xl leading-none font-bold">{format.dateTime(date, { day: "numeric" })}</span>
            <span className="sr-only">{format.dateTime(date, { month: "long" })}</span>
            {isToday && <span className="sr-only">{t("today")}</span>}
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
