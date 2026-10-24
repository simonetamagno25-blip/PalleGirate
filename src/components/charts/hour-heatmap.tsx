"use client";

import { useTranslations } from "next-intl";
import { Board } from "@/components/board/board";
import { cn } from "@/lib/utils";

/*
 * Busiest hours as a board: weekdays × opening hours, each cell an off-white intensity step on the flap face
 * (4 levels of the busiest cell; amber stays reserved for yours / primary / live) with the count written in it,
 * so the reading never rests on color alone. Ink: light on steps 1–2 (9.8:1, 4.9:1), #111 on steps 3–4 (7.7:1, 13.7:1).
 */
const STEPS = [
  "bg-flap text-flap-ink-muted",
  "bg-[color-mix(in_srgb,var(--flap-ink)_20%,var(--flap))] text-flap-ink",
  "bg-[color-mix(in_srgb,var(--flap-ink)_40%,var(--flap))] text-flap-ink",
  "bg-[color-mix(in_srgb,var(--flap-ink)_66%,var(--flap))] text-[#111111]",
  "bg-[color-mix(in_srgb,var(--flap-ink)_90%,var(--flap))] text-[#111111]",
];

const pad = (h: number) => String(h).padStart(2, "0");

export function HourHeatmap({ title, cells, fromHour, toHour, weekdayLabels }: { title: string; cells: { weekday: number; hour: number; count: number }[]; fromHour: number; toHour: number; weekdayLabels: string[] }) {
  const t = useTranslations("adminDashboard");
  const max = Math.max(1, ...cells.map((c) => c.count));
  const hours = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i);
  const get = (w: number, h: number) => cells.find((c) => c.weekday === w && c.hour === h)?.count ?? 0;
  const level = (c: number) => (c === 0 ? 0 : Math.max(1, Math.ceil((c / max) * 4)));
  const legend = (
    <span className="inline-flex items-center gap-1.5">
      {t("heatLess")}
      {STEPS.map((s, i) => <span key={i} aria-hidden className={cn("size-4 rounded-[3px]", s)} />)}
      {t("heatMore")}
    </span>
  );
  return (
    <Board id="heatmap" title={title} meta={legend}>
      <div className="relative -mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        <table className="border-separate border-spacing-1">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <td className="sticky left-0 z-10 bg-board" />
              {hours.map((h) => (
                <th key={h} scope="col" className="min-w-9 text-center font-display text-sm font-semibold text-flap-ink-muted">{pad(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weekdayLabels.map((label, w) => (
              <tr key={label}>
                <th scope="row" className="sticky left-0 z-10 bg-board pr-2 text-left font-display text-base font-bold tracking-[0.03em] text-flap-ink uppercase">{label}</th>
                {hours.map((h) => {
                  const c = get(w, h);
                  return (
                    <td
                      key={h}
                      title={t("heatCell", { day: label, hour: h, count: c })}
                      className={cn("h-9 min-w-9 rounded-sm text-center font-display text-base leading-none font-bold", STEPS[level(c)])}
                    >
                      {c > 0 ? c : <span className="sr-only">{c}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Board>
  );
}
