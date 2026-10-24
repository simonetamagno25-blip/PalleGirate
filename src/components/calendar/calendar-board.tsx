import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { hourCells, type HourCell } from "@/lib/calendar/board";
import { minutesToHHMM } from "@/lib/time/rome";
import { cn } from "@/lib/utils";
import type { BoardRow, DayBoard } from "@/server/availability";
import { Board, BoardCell, BoardRowHeader, BoardTable, FlapLink, FlapMine, FlapTaken } from "@/components/board/board";
import { SplitFlap } from "@/components/board/split-flap";

const pad = (h: number) => String(h).padStart(2, "0");
const SAMPLE_TIME = "18:00";
const DASH = "—";

/**
 * The day's board. Wide screens: courts × hours as one table (first free start of each hour, yours, taken).
 * Narrower screens: one row per court with its free times scrolling sideways under a sticky court name.
 */
export async function CalendarBoard({ board, title, note, bookable }: { board: DayBoard; title: string; note?: string; bookable: boolean }) {
  const t = await getTranslations("calendar");
  const tb = await getTranslations("board");
  const rows = board.rows.map((row) => ({ row, cells: hourCells({ openMinutes: board.openMinutes, closeMinutes: board.closeMinutes, starts: row.starts, bookings: row.bookings }) }));
  const hours = rows[0]?.cells.map((c) => c.hour) ?? [];
  const bookHref = (row: BoardRow, minute: number) => `/book?field=${row.id}&day=${board.day}&time=${minute}`;

  const renderCell = (row: BoardRow, c: HourCell, compact: boolean) => {
    if (c.kind === "free") {
      return (
        <FlapLink
          href={bookHref(row, c.minute)}
          time={minutesToHHMM(c.minute)}
          label={tb("bookAt", { field: row.name, time: minutesToHHMM(c.minute) })}
          className={compact ? "w-full min-w-0 px-1 text-lg" : undefined}
        />
      );
    }
    if (c.kind === "mine") {
      const label = tb("mineAt", { field: row.name, from: minutesToHHMM(c.startMin), to: minutesToHHMM(c.endMin) });
      if (!compact) return <FlapMine href="/bookings" time={minutesToHHMM(c.startMin)} mineLabel={tb("mine")} label={label} />;
      return (
        <span className="flap-face flex h-11 w-full flex-col items-center justify-center bg-lamp-amber leading-none text-[#111111]">
          <span aria-hidden className="font-display text-base font-bold">{minutesToHHMM(c.startMin)}</span>
          <span aria-hidden className="flex items-center gap-0.5 text-xs font-semibold"><Check className="size-3" strokeWidth={3} />{tb("mine")}</span>
          <span className="sr-only">{label}</span>
        </span>
      );
    }
    if (c.kind === "taken") return <FlapTaken label={tb("taken")} detail={c.memberName} className={compact ? "w-full min-w-0" : undefined} />;
    // Past or too late to fit a slot: a visible dim dash on the grid (spoken as "non disponibile"), never an empty hole.
    return compact ? <FlapTaken label={tb("unavailable")} className="w-full min-w-0" /> : <span className="sr-only">{tb("unavailable")}</span>;
  };

  return (
    <Board id="day-board" title={title} meta={t("legend")}>
      <Legend free={tb("free")} mine={tb("mine")} taken={tb("taken")} title={t("legendTitle")} />
      {note && <p className="mb-3 border-t border-flap-seam pt-3 text-base text-flap-ink">{note}</p>}

      {/* Wide: courts × hours. */}
      <div className="hidden overflow-x-auto xl:block">
        <BoardTable
          caption={t("boardCaption", { date: title })}
          className="table-fixed"
          headers={[{ key: "court", label: tb("court"), className: "sticky left-0 z-10 w-44 bg-board" }, ...hours.map((h) => ({ key: String(h), label: pad(h), className: "text-center" }))]}
        >
          {rows.map(({ row, cells }) => (
            <tr key={row.id} className="border-t border-flap-seam">
              <BoardRowHeader className="sticky left-0 z-10 bg-board">
                <span className="block">{row.name}</span>
                {/* Same state as phone and home: a row with nothing left to book says so in red flaps. */}
                {bookable && !cells.some((c) => c.kind === "free" || c.kind === "mine") && (
                  <SplitFlap value={tb("full")} label={tb("fullSpoken")} size="sm" tone="red" className="mt-1" />
                )}
              </BoardRowHeader>
              {cells.map((c) => (
                <BoardCell key={c.hour} className="px-0.5 text-center">{renderCell(row, c, true)}</BoardCell>
              ))}
            </tr>
          ))}
        </BoardTable>
      </div>

      {/* Phone and tablet: one row per court, free times scroll sideways. */}
      <ul className="xl:hidden">
        {rows.map(({ row, cells }) => {
          const visible = cells.filter((c) => c.kind === "free" || (c.kind === "mine" && c.startMin >= c.hour * 60));
          return (
            <li key={row.id} className="border-t border-flap-seam">
              <div className="flex items-center overflow-x-auto py-2 [scrollbar-width:thin]">
                <h3 className="sticky left-0 z-10 w-28 shrink-0 self-stretch bg-board pr-2 font-display text-lg leading-tight font-bold tracking-[0.03em] uppercase">
                  <span className="flex h-full items-center">{row.name}</span>
                </h3>
                <div className="flex gap-1.5 pr-1">
                  {visible.map((c) => <span key={c.hour} className="shrink-0">{renderCell(row, c, false)}</span>)}
                  {bookable && visible.length === 0 && <SplitFlap value={tb("full")} label={tb("fullSpoken")} size="sm" tone="red" />}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Board>
  );
}

function Legend({ free, mine, taken, title }: { free: string; mine: string; taken: string; title: string }) {
  const sample = "flap-face inline-flex h-7 items-center justify-center px-2 font-display text-base leading-none font-bold";
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9375rem] text-flap-ink-muted">
      <h3 className="sr-only">{title}</h3>
      <span className="inline-flex items-center gap-2"><span aria-hidden className={sample}>{SAMPLE_TIME}</span>{free}</span>
      <span className="inline-flex items-center gap-2">
        <span aria-hidden className={cn(sample, "gap-1 bg-lamp-amber text-[#111111]")}><Check className="size-3.5" strokeWidth={3} />{SAMPLE_TIME}</span>
        {mine}
      </span>
      <span className="inline-flex items-center gap-2"><span aria-hidden className={cn(sample, "min-w-9 bg-flap/60 font-sans font-normal text-flap-ink-muted")}>{DASH}</span>{taken}</span>
    </div>
  );
}
