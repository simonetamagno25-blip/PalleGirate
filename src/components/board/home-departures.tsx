"use client";

import { useRef, useState, useTransition } from "react";
import { DayStrip } from "@/components/calendar/day-strip";
import type { DayBoard } from "@/server/availability";
import { dayBoardAction } from "@/app/(app)/dashboard/actions";
import { DeparturesBoard } from "./departures-board";

/**
 * Home: the day strip over today's departures. Picking a day loads that day's board in place (the times flip) and
 * keeps the choice in the URL (?day=) so a reload or a shared link shows the same day.
 */
export function HomeDepartures({ initial, days, today, nowMinute }: { initial: DayBoard; days: string[]; today: string; nowMinute: number }) {
  const [board, setBoard] = useState(initial);
  // The strip answers at once; the board follows when its data arrives.
  const [selected, setSelected] = useState(initial.day);
  const [pending, start] = useTransition();
  const request = useRef(0);
  const select = (day: string) => {
    if (day === selected) return;
    setSelected(day);
    const id = ++request.current;
    start(async () => {
      const next = await dayBoardAction(day);
      if (!next || id !== request.current) return;
      setBoard(next);
      window.history.replaceState(null, "", day === today ? "/dashboard" : `/dashboard?day=${day}`);
    });
  };
  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <DayStrip days={days} selected={selected} today={today} onSelect={select} />
      <DeparturesBoard board={board} today={today} nowMinute={nowMinute} busy={pending} onSelectDay={select} className="flex-1" />
    </div>
  );
}
