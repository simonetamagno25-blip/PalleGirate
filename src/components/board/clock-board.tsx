"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SplitFlap } from "./split-flap";

const romeTime = () => new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Rome" }).format(new Date());

/**
 * The welcome strip on login and activation: a greeting and the club's current time in flap tiles (the name is already
 * in the top bar). The time
 * flips when the minute turns. `initial` comes from the server so the first paint matches.
 */
export function ClockBoard({ initial }: { initial: string }) {
  const t = useTranslations("auth");
  const [time, setTime] = useState(initial);
  useEffect(() => {
    const tick = () => setTime(romeTime());
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="board-surface flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-lg p-4 ring-1 ring-board-edge">
      <SplitFlap value={t("welcome").toUpperCase()} size="sm" label={t("welcome")} />
      <SplitFlap value={time} size="md" label={t("clock", { time })} />
    </div>
  );
}
