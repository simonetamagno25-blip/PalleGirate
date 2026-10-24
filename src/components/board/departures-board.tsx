import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { nextDepartures } from "@/lib/calendar/board";
import { addDays, minutesToHHMM } from "@/lib/time/rome";
import type { DayBoard } from "@/server/availability";
import { Board, BoardCell, BoardRow, BoardRowHeader, BoardTable, FlapLink, FlapMine } from "./board";
import { SplitFlap } from "./split-flap";

/**
 * "Partenze di oggi": one row per active court with the next three free start times (one slot apart) as flap cells
 * that open the wizard preselected, your bookings in amber, and COMPLETO when nothing is left today.
 */
export async function DeparturesBoard({ board, nowMinute }: { board: DayBoard; nowMinute: number }) {
  const t = await getTranslations("dashboard");
  const tb = await getTranslations("board");
  const shortestSlot = Math.min(...board.rows.map((r) => r.slotMinutes));
  const closed = board.rows.every((r) => r.starts.length === 0) && nowMinute + shortestSlot > board.closeMinutes;
  return (
    <Board
      id="departures"
      title={t("departures")}
      meta={
        <Link href="/calendar" className="inline-flex min-h-11 items-center font-medium text-lamp-amber underline decoration-1 underline-offset-4 hover:no-underline">
          {t("fullCalendar")}
        </Link>
      }
    >
      {closed ? (
        <div className="space-y-3 border-t border-flap-seam pt-4">
          <p className="text-base text-flap-ink">{t("closedToday")}</p>
          <Link href={`/calendar?day=${addDays(board.day, 1)}`} className="inline-flex min-h-11 items-center font-medium text-lamp-amber underline underline-offset-4 hover:no-underline">
            {t("seeTomorrow")}
          </Link>
        </div>
      ) : (
        <BoardTable
          caption={t("departuresCaption")}
          headers={[
            { key: "court", label: tb("court"), className: "w-[34%] sm:w-40" },
            { key: "times", label: tb("nextTimes") },
          ]}
        >
          {board.rows.map((row) => {
            const free = nextDepartures(row.starts, 3, row.slotMinutes).map((m) => ({ kind: "free" as const, minute: m }));
            const mine = row.bookings.filter((b) => b.mine && b.endMin > nowMinute).map((b) => ({ kind: "mine" as const, minute: b.startMin, endMin: b.endMin }));
            const cells = [...mine, ...free].sort((a, b) => a.minute - b.minute);
            return (
              <BoardRow key={row.id}>
                <BoardRowHeader>{row.name}</BoardRowHeader>
                <BoardCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {cells.map((c) =>
                      c.kind === "mine" ? (
                        <FlapMine
                          key={`m${c.minute}`}
                          href="/bookings"
                          time={minutesToHHMM(c.minute)}
                          mineLabel={tb("mine")}
                          label={tb("mineAt", { field: row.name, from: minutesToHHMM(c.minute), to: minutesToHHMM(c.endMin) })}
                        />
                      ) : (
                        <FlapLink
                          key={c.minute}
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
