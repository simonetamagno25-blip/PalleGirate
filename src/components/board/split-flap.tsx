"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";
type Tone = "default" | "amber" | "red";

// Tile heights: sm 28px (board rows), md 40px, lg 56px (next game). Digits keep a fixed width so times line up.
const TILE: Record<Size, string> = {
  sm: "h-7 min-w-[1.125rem] px-[3px]",
  md: "h-10 min-w-7 px-1",
  lg: "h-14 min-w-9 px-1",
};
const TEXT: Record<Size, string> = { sm: "text-xl", md: "text-3xl", lg: "text-4xl" };
const GAP: Record<Size, string> = { sm: "gap-[2px]", md: "gap-[3px]", lg: "gap-1" };
const TONE: Record<Tone, string> = {
  default: "bg-flap text-flap-ink",
  amber: "bg-lamp-amber text-[#111111]",
  red: "bg-flap text-lamp-red-board",
};
// Punctuation sits between tiles, like the colon on a station board.
const SEPARATORS = new Set([":", ".", ",", "-", "–", "/"]);

const FOLD_MS = 110; // each half: 2 × 110 = 220ms per character
const STAGGER_MS = 50;
const FADE_MS = 120;

type Run = { id: number; from: string; all: boolean; reduce: boolean };

/**
 * A value shown as split-flap tiles. When `value` changes (or `flipKey` changes, to replay a flip on the same value),
 * each changed character flips: the old top half folds down, then the new bottom half drops, staggered per character.
 * Reduced motion swaps instantly with a short crossfade. The first paint never animates.
 */
export function SplitFlap({
  value,
  size = "md",
  tone = "default",
  label,
  flipKey,
  className,
}: {
  value: string;
  size?: Size;
  tone?: Tone;
  /** Accessible text, when it should differ from the visible value. */
  label?: string;
  flipKey?: string | number;
  className?: string;
}) {
  const prevValue = useRef(value);
  const prevKey = useRef(flipKey);
  const [run, setRun] = useState<Run | null>(null);

  useEffect(() => {
    const changed = prevValue.current !== value;
    const forced = prevKey.current !== flipKey;
    if (!changed && !forced) return;
    const from = prevValue.current;
    prevValue.current = value;
    prevKey.current = flipKey;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setRun((r) => ({ id: (r?.id ?? 0) + 1, from, all: forced, reduce }));
  }, [value, flipKey]);

  // Back to plain tiles once the last character has landed.
  useEffect(() => {
    if (!run) return;
    const total = run.reduce ? FADE_MS : FOLD_MS * 2 + STAGGER_MS * value.length + 40;
    const timer = window.setTimeout(() => setRun(null), total);
    return () => window.clearTimeout(timer);
  }, [run, value.length]);

  const chars = Array.from(value);
  const fromChars = run ? Array.from(run.from) : [];
  let tileIndex = 0;

  return (
    <span className={cn("inline-flex items-center align-middle", className)}>
      <span className="sr-only">{label ?? value}</span>
      <span aria-hidden className={cn("inline-flex items-center font-display leading-none font-bold", GAP[size], TEXT[size])}>
        {chars.map((ch, i) => {
          if (ch === " ") return <span key={i} className={size === "sm" ? "w-1" : "w-2"} />;
          if (SEPARATORS.has(ch)) {
            return (
              <span key={i} className={cn("px-px", tone === "red" && "text-lamp-red-board")}>
                {ch}
              </span>
            );
          }
          const old = fromChars[i] ?? " ";
          const animate = run !== null && (run.all || old !== ch);
          const delay = tileIndex++ * STAGGER_MS;
          return (
            <Tile key={animate ? `${i}-${run.id}` : i} ch={ch} old={old} size={size} tone={tone} animate={animate} reduce={run?.reduce ?? false} delay={delay} />
          );
        })}
      </span>
    </span>
  );
}

function Tile({ ch, old, size, tone, animate, reduce, delay }: { ch: string; old: string; size: Size; tone: Tone; animate: boolean; reduce: boolean; delay: number }) {
  const face = cn("flap-face relative inline-grid place-items-center", size !== "sm" && "flap-hinge", TILE[size], TONE[tone]);
  if (!animate) return <span className={face}>{ch}</span>;
  if (reduce) {
    return (
      <span className={face}>
        <span className="animate-[flap-fade_120ms_ease-out_both]">{ch}</span>
      </span>
    );
  }
  return (
    <span className={cn(face, "[perspective:240px]")}>
      {/* Sizer keeps the tile's width; the halves below are absolutely positioned. */}
      <span className="invisible">{ch}</span>
      <Half ch={ch} half="top" />
      <Half ch={old} half="bottom" />
      <Half ch={old} half="top" className="animate-[flap-fold-top_110ms_ease-in_both]" delay={delay} />
      <Half ch={ch} half="bottom" className="animate-[flap-fold-bottom_110ms_var(--ease-out-quart)_both]" delay={delay + FOLD_MS} />
    </span>
  );
}

function Half({ ch, half, className, delay }: { ch: string; half: "top" | "bottom"; className?: string; delay?: number }) {
  return (
    <span
      className={cn(
        "absolute inset-0 grid place-items-center rounded-[inherit] bg-inherit [backface-visibility:hidden] [transform-origin:50%_50%]",
        half === "top" ? "[clip-path:inset(0_0_50%_0)]" : "[clip-path:inset(50%_0_0_0)]",
        className,
      )}
      style={delay !== undefined ? { animationDelay: `${delay}ms` } : undefined}
    >
      {ch}
    </span>
  );
}
