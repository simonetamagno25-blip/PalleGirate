"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { nextDepartures } from "@/lib/calendar/board";
import { addDays, minutesToHHMM } from "@/lib/time/rome";
import { cn } from "@/lib/utils";
import type { DayBoard } from "@/server/availability";
import { Board, BoardCell, BoardRow, BoardRowHeader, BoardTable, FlapLink, FlapMine } from "./board";
import { SplitFlap } from "./split-flap";

/**
 * "Partenze di oggi" (or of the chosen day): one row per active court with the next three free start times (one slot
 * apart) as flap cells that open the wizard preselected, your bookings in amber, and COMPLETO when nothing is left.
 * Cells are keyed by position, so when the day changes the times flip in place like a station board.
 */
export function DeparturesBoard({ board, today, nowMinute, busy = false, onSelectDay, className }: { board: DayBoard; today: string; nowMinute: number; busy?: boolean; onSelectDay?: (day: string) => void; className?: string }) {
  const t = useTranslations("dashboard");
  const tb = useTranslations("board");
  const format = useFormatter();
  const isToday = board.day === today;
  const after = isToday ? nowMinute : -1;
  const shortestSlot = Math.min(...board.rows.map((r) => r.slotMinutes));
  const closed = isToday && board.rows.every((r) => r.starts.length === 0) && nowMinute + shortestSlot > board.closeMinutes;
  const tomorrow = addDays(today, 1);
  const linkCls = "inline-flex min-h-11 items-center font-medium text-lamp-amber underline decoration-1 underline-offset-4 hover:no-underline";
  const title = isToday ? t("departures") : t("departuresOn", { date: format.dateTime(new Date(`${board.day}T12:00:00Z`), { weekday: "long", day: "numeric" }) });
  return (
    <Board id="departures" title={title} meta={<Link href={`/calendar?day=${board.day}`} className={linkCls}>{t("fullCalendar")}</Link>} className={cn(busy && "[&_table]:opacity-60", className)}>
      {closed ? (
        <div className="space-y-3 pt-1">
          <p className="text-base text-flap-ink">{t("closedToday")}</p>
          {onSelectDay ? (
            <button type="button" onClick={() => onSelectDay(tomorrow)} className={linkCls}>{t("seeTomorrow")}</button>
          ) : (
            <Link href={`/calendar?day=${tomorrow}`} className={linkCls}>{t("seeTomorrow")}</Link>
          )}
        </div>
      ) : (
        <BoardTable
          caption={title}
          className="table-fixed transition-opacity duration-150"
          headers={[
            { key: "court", label: tb("court"), className: "w-24 sm:w-40" },
            { key: "times", label: tb("nextTimes") },
          ]}
        >
          {board.rows.map((row) => {
            const free = nextDepartures(row.starts, 3, row.slotMinutes).map((m) => ({ kind: "free" as const, minute: m }));
            const mine = row.bookings.filter((b) => b.mine && b.endMin > after).map((b) => ({ kind: "mine" as const, minute: b.startMin, endMin: b.endMin }));
            const cells = [...mine, ...free].sort((a, b) => a.minute - b.minute);
            return (
              <BoardRow key={row.id}>
                <BoardRowHeader>{row.name}</BoardRowHeader>
                <BoardCell>
                  {/* One line per court: the times scroll sideways on a narrow phone; the cut-off cell shows there is more. */}
                  <div className="flex snap-x scroll-px-1 items-center gap-1.5 overflow-x-auto py-0.5 pr-1 [scrollbar-width:thin] *:shrink-0 *:snap-start">
                    {cells.map((c, i) =>
                      c.kind === "mine" ? (
                        <FlapMine
                          key={`m${i}`}
                          href="/bookings"
                          time={minutesToHHMM(c.minute)}
                          mineLabel={tb("mine")}
                          label={tb("mineAt", { field: row.name, from: minutesToHHMM(c.minute), to: minutesToHHMM(c.endMin) })}
                        />
                      ) : (
                        <FlapLink
                          key={`f${i}`}
                          flip
                          href={`/book?field=${row.id}&day=${board.day}&time=${c.minute}`}
                          time={minutesToHHMM(c.minute)}
                          label={tb("bookAt", { field: row.name, time: minutesToHHMM(c.minute) })}
                        />
                      ),
                    )}
                    {cells.length === 0 && <SplitFlap value={tb("full")} label={tb("fullSpoken")} size="sm" tone="red" />}
                  </div>
                </BoardCell>
              </BoardRow>
            );
          })}
        </BoardTable>
      )}
    </Board>
  );
}
