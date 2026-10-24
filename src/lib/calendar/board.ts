import { overlaps } from "./grid";

/** Una prenotazione vista dal tabellone: solo intervallo e "tua", mai chi l'ha fatta (il nome c'è solo per l'admin). */
export type BoardBooking = { startMin: number; endMin: number; mine: boolean; memberName?: string };

/**
 * Le prossime "partenze" di un campo: il primo orario libero, poi i successivi distanti almeno `gapMinutes`
 * (di solito la durata di uno slot), così tre orari mostrano tre scelte davvero diverse e non 18:00, 18:15, 18:30.
 * `starts` sono gli orari di inizio liberi in ordine crescente, già filtrati dalle regole (vedi `freeStarts`).
 */
export function nextDepartures(starts: number[], count: number, gapMinutes: number): number[] {
  const out: number[] = [];
  for (const m of starts) {
    if (out.length >= count) break;
    if (out.length === 0 || m >= out[out.length - 1] + gapMinutes) out.push(m);
  }
  return out;
}

export type HourCell =
  | { hour: number; kind: "free"; minute: number }
  | { hour: number; kind: "mine"; startMin: number; endMin: number }
  | { hour: number; kind: "taken"; memberName?: string }
  | { hour: number; kind: "unavailable" };

/**
 * Una cella per ogni ora di apertura del tabellone del giorno. Priorità: la tua prenotazione che inizia in quell'ora,
 * poi il primo inizio libero dell'ora, poi la tua prenotazione che continua, poi "occupato", altrimenti non disponibile
 * (ora passata o slot che non sta prima della chiusura).
 */
export function hourCells(p: { openMinutes: number; closeMinutes: number; starts: number[]; bookings: BoardBooking[] }): HourCell[] {
  const cells: HourCell[] = [];
  for (let hour = Math.floor(p.openMinutes / 60); hour * 60 < p.closeMinutes; hour++) {
    const span = { startMin: hour * 60, endMin: hour * 60 + 60 };
    const inHour = p.bookings.filter((b) => overlaps(b, span));
    const mineStarting = inHour.find((b) => b.mine && b.startMin >= span.startMin);
    const free = p.starts.find((m) => m >= span.startMin && m < span.endMin);
    const mine = inHour.find((b) => b.mine);
    const taken = inHour.find((b) => !b.mine);
    if (mineStarting) cells.push({ hour, kind: "mine", startMin: mineStarting.startMin, endMin: mineStarting.endMin });
    else if (free !== undefined) cells.push({ hour, kind: "free", minute: free });
    else if (mine) cells.push({ hour, kind: "mine", startMin: mine.startMin, endMin: mine.endMin });
    else if (taken) cells.push({ hour, kind: "taken", memberName: taken.memberName });
    else cells.push({ hour, kind: "unavailable" });
  }
  return cells;
}
