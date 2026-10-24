"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Board, FlapButton } from "@/components/board/board";
import { SplitFlap } from "@/components/board/split-flap";
import { DayStrip } from "@/components/calendar/day-strip";
import { Money } from "@/components/common/money";
import { NativeSelect } from "@/components/common/native-select";
import { StatusLamp } from "@/components/common/status-lamp";
import { ViolationList } from "@/components/common/violation-list";
import type { Violation } from "@/lib/booking-rules";
import type { FreeStart } from "@/lib/calendar/free-starts";
import { addDays, diffDays, minutesToHHMM } from "@/lib/time/rome";
import { cn } from "@/lib/utils";
import { freeStartsAction, submitBookingAction } from "@/app/(app)/book/actions";

export type WizardField = { id: string; name: string; slotMinutes: number; priceCents: number };

const LONG_DAY = { weekday: "long", day: "numeric", month: "long" } as const;
// After a confirmed booking the summary time flips; the page moves on once the flip has landed.
const CONFIRM_PAUSE_MS = 900;

export function BookingWizard(props: {
  fields: WizardField[];
  initial: { fieldId?: string; day: string; minute?: number; slots?: number };
  minDay: string;
  maxDay?: string;
  maxSlots: number;
  mode: "member" | "admin";
  bookingId?: string;
  members?: { id: string; name: string }[];
}) {
  const t = useTranslations("wizard");
  const tm = useTranslations("dashboard");
  const format = useFormatter();
  const router = useRouter();
  const [fieldId, setFieldId] = useState(props.initial.fieldId ?? props.fields[0]?.id ?? "");
  const [day, setDay] = useState(props.initial.day);
  const [minute, setMinute] = useState<number | undefined>(props.initial.minute);
  const [slots, setSlots] = useState(props.initial.slots ?? 1);
  const [memberId, setMemberId] = useState(props.members?.[0]?.id);
  const [starts, setStarts] = useState<FreeStart[]>([]);
  const [errors, setErrors] = useState<Violation[]>([]);
  const [confirmed, setConfirmed] = useState(0);
  const [loading, startLoading] = useTransition();
  const [submitting, startSubmit] = useTransition();

  const field = props.fields.find((f) => f.id === fieldId);
  const chosen = starts.find((s) => s.minute === minute);

  const key = `${fieldId}|${day}`;
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    startLoading(async () => {
      setStarts(await freeStartsAction({ fieldId, day, excludeBookingId: props.bookingId, mode: props.mode }));
      setLoadedFor(`${fieldId}|${day}`);
    });
  }, [fieldId, day, props.bookingId, props.mode]);

  // Se l'orario scelto non è libero per il campo e il giorno appena caricati, si toglie la selezione.
  // Prima del primo caricamento non si tocca nulla, così l'orario arrivato dal calendario resta selezionato.
  useEffect(() => {
    if (loadedFor !== key) return;
    if (minute !== undefined && !starts.some((s) => s.minute === minute)) setMinute(undefined);
    if (chosen && slots > chosen.maxSlots) setSlots(chosen.maxSlots);
  }, [loadedFor, key, starts, minute, chosen, slots]);

  const submit = () =>
    startSubmit(async () => {
      if (minute === undefined) return;
      const r = await submitBookingAction({ bookingId: props.bookingId, memberId, mode: props.mode, fieldId, day, minute, slots });
      if (r.ok) {
        setErrors([]);
        setConfirmed((n) => n + 1);
        toast.success(props.bookingId ? t("doneEdit") : t("done"));
        await new Promise((resolve) => setTimeout(resolve, CONFIRM_PAUSE_MS));
        router.push(props.mode === "admin" ? "/admin/bookings" : "/bookings");
      } else {
        setErrors(r.violations);
        setStarts(await freeStartsAction({ fieldId, day, excludeBookingId: props.bookingId, mode: props.mode }));
      }
    });

  // A short horizon (member) gets the day strip; an open-ended one (admin) keeps the date field.
  const stripDays = props.maxDay && diffDays(props.minDay, props.maxDay) <= 31
    ? Array.from({ length: diffDays(props.minDay, props.maxDay) + 1 }, (_, i) => addDays(props.minDay, i))
    : null;
  const pickDay = (d: string) => {
    setDay(d);
    setErrors([]);
  };

  // Free starts grouped by hour: one row per hour, four quarter columns, like a timetable.
  const byHour = new Map<number, FreeStart[]>();
  for (const s of starts) byHour.set(Math.floor(s.minute / 60), [...(byHour.get(Math.floor(s.minute / 60)) ?? []), s]);

  const dateText = format.dateTime(new Date(`${day}T12:00:00Z`), LONG_DAY);
  const endMinute = field && minute !== undefined ? minute + slots * field.slotMinutes : undefined;
  let step = 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <ol className="space-y-6">
        {props.members && (
          <Step n={++step} title={t("member")} id="step-member">
            <NativeSelect aria-labelledby="step-member" value={memberId} onChange={(e) => setMemberId(e.target.value)} className="sm:max-w-md">
              {props.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </NativeSelect>
          </Step>
        )}

        <Step n={++step} title={t("stepDay")} id="step-day">
          {stripDays ? (
            <DayStrip days={stripDays} selected={day} today={props.minDay} onSelect={pickDay} />
          ) : (
            <Input type="date" aria-labelledby="step-day" value={day} min={props.minDay} max={props.maxDay} onChange={(e) => e.target.value && pickDay(e.target.value)} className="w-48" />
          )}
          <p className="mt-2 text-base text-muted-foreground">{dateText}</p>
        </Step>

        <Step n={++step} title={t("stepField")} id="step-field">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {props.fields.map((f) => {
              const selected = f.id === fieldId;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFieldId(f.id)}
                  className={cn(
                    "flex min-h-16 flex-col items-start justify-center rounded-md px-3 py-2 text-left transition-colors duration-150",
                    selected ? "bg-board text-flap-ink ring-2 ring-lamp-amber" : "bg-card ring-1 ring-input hover:bg-accent",
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="font-display text-xl leading-tight font-bold tracking-[0.02em]">{f.name}</span>
                    {selected && <Check className="size-5 shrink-0 text-lamp-amber" strokeWidth={3} aria-hidden />}
                  </span>
                  <span className={cn("text-sm", selected ? "text-flap-ink-muted" : "text-muted-foreground")}>{t("slotLength", { minutes: f.slotMinutes })}</span>
                </button>
              );
            })}
          </div>
        </Step>

        <Step n={++step} title={t("stepTime")} id="step-time">
          <div className="board-surface rounded-lg p-3 ring-1 ring-board-edge sm:p-4" aria-busy={loading}>
            {!loading && starts.length === 0 && (
              <div className="space-y-1 py-2">
                <p className="text-base text-flap-ink">{t("noTimes")}</p>
                <p className="text-[0.9375rem] text-flap-ink-muted">{t("noTimesHint")}</p>
              </div>
            )}
            <div role="group" aria-label={t("timesLabel")} className={cn("space-y-1.5 transition-opacity duration-150", loading && "opacity-50")}>
              {[...byHour.entries()].map(([hour, list]) => (
                <div key={hour} className="grid grid-cols-[2.25rem_repeat(4,minmax(0,1fr))] items-center gap-1.5">
                  <span className="font-display text-lg font-bold text-flap-ink-muted" aria-hidden>{String(hour).padStart(2, "0")}</span>
                  {[0, 15, 30, 45].map((q) => {
                    const s = list.find((x) => x.minute === hour * 60 + q);
                    return s ? (
                      <FlapButton key={q} time={minutesToHHMM(s.minute)} selected={s.minute === minute} onClick={() => setMinute(s.minute)} className="px-1" />
                    ) : (
                      <span key={q} aria-hidden />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Step>

        <Step n={++step} title={t("stepDuration")} id="step-duration">
          <div className="grid grid-cols-2 gap-2">
            {field &&
              Array.from({ length: props.maxSlots }, (_, i) => i + 1).map((n) => {
                const disabled = !chosen || n > chosen.maxSlots;
                const selected = n === slots && !disabled;
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    onClick={() => setSlots(n)}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center rounded-md px-3 py-2 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45",
                      selected ? "bg-board text-flap-ink ring-2 ring-lamp-amber" : "bg-card ring-1 ring-input enabled:hover:bg-accent",
                    )}
                  >
                    <span className="flex items-center gap-1.5 font-display text-2xl leading-none font-bold">
                      {selected && <Check className="size-5 text-lamp-amber" strokeWidth={3} aria-hidden />}
                      {t("minutes", { minutes: n * field.slotMinutes })}
                    </span>
                    <span className={cn("text-sm", selected ? "text-flap-ink-muted" : "text-muted-foreground")}>{t("slotCount", { count: n })}</span>
                  </button>
                );
              })}
          </div>
        </Step>
      </ol>

      <div className="lg:sticky lg:top-20">
        <Board id="summary" title={t("stepSummary")}>
          {field && minute !== undefined && endMinute !== undefined ? (
            <div className="space-y-4">
              <p className="sr-only" aria-live="polite">
                {t("summary", { field: field.name, date: dateText, from: minutesToHHMM(minute), to: minutesToHHMM(endMinute) })}
              </p>
              <div className="space-y-1.5" aria-hidden>
                <SplitFlap value={minutesToHHMM(minute)} size="md" flipKey={confirmed} />
                <p className="text-base text-flap-ink-muted">{tm("until", { time: minutesToHHMM(endMinute) })}</p>
              </div>
              <dl className="space-y-2 border-t border-flap-seam pt-3">
                <div>
                  <dt className="sr-only">{t("stepField")}</dt>
                  <dd className="font-display text-2xl leading-tight font-bold tracking-[0.03em] uppercase">{field.name}</dd>
                </div>
                <div>
                  <dt className="sr-only">{t("when")}</dt>
                  <dd className="text-lg">{dateText}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-flap-seam pt-2">
                  <dt className="text-base text-flap-ink-muted">{t("price")}</dt>
                  <dd className="font-display text-3xl leading-none font-bold"><Money cents={field.priceCents * slots} /></dd>
                </div>
              </dl>
              {confirmed > 0 && <StatusLamp tone="green" onBoard className="text-base font-semibold">{t("confirmed")}</StatusLamp>}
            </div>
          ) : null}
          {errors.length > 0 && <div className="mt-4"><ViolationList violations={errors} /></div>}
          <Button
            size="lg"
            className={cn("w-full", minute !== undefined && "mt-5")}
            disabled={minute === undefined || submitting || confirmed > 0}
            aria-describedby={minute === undefined ? "confirm-reason" : undefined}
            onClick={submit}
          >
            {props.bookingId ? t("confirmEdit") : t("confirm")}
          </Button>
          {/* Disabled is neutral grey, never dim amber; the reason sits right under it. */}
          {minute === undefined && <p id="confirm-reason" className="mt-2 text-[0.9375rem] text-flap-ink-muted">{t("pickFirst")}</p>}
        </Board>
      </div>
    </div>
  );
}

/** A numbered step: the sequence is real here, so the number earns its place. */
function Step({ n, title, id, children }: { n: number; title: string; id: string; children: React.ReactNode }) {
  return (
    <li className="space-y-3">
      <h2 id={id} className="flex items-center gap-3 text-xl font-semibold">
        <span aria-hidden className="flap-face inline-grid h-8 min-w-7 place-items-center px-1.5 font-display text-xl leading-none font-bold">{n}</span>
        {title}
      </h2>
      {children}
    </li>
  );
}
