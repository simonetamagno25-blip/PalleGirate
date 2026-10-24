import type { DateTimeFormatOptions } from "next-intl";

/** Orari sempre a 24 ore, anche in inglese (che altrimenti userebbe AM/PM). */
const H23 = { hourCycle: "h23" } as const satisfies DateTimeFormatOptions;

/** Solo l'ora, es. 18:30. */
export const TIME_ONLY = { hour: "2-digit", minute: "2-digit", ...H23 } as const satisfies DateTimeFormatOptions;

/** Giorno abbreviato con ora, es. "sab 24 ott, 18:30". */
export const SHORT_DAY_TIME = { weekday: "short", day: "numeric", month: "short", ...TIME_ONLY } as const satisfies DateTimeFormatOptions;

/** Giorno esteso con ora, es. "sabato 24 ott, 18:30". */
export const LONG_DAY_TIME = { weekday: "long", day: "numeric", month: "short", ...TIME_ONLY } as const satisfies DateTimeFormatOptions;

/** Data e ora compatte per le tabelle. */
export const DATE_TIME_SHORT = { dateStyle: "short", timeStyle: "short", ...H23 } as const satisfies DateTimeFormatOptions;

/** Data e ora con mese abbreviato. */
export const DATE_TIME_MEDIUM = { dateStyle: "medium", timeStyle: "short", ...H23 } as const satisfies DateTimeFormatOptions;
