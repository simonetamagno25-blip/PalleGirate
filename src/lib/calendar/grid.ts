export type BusyInterval = { startMin: number; endMin: number };

export function quarterRows(openMinutes: number, closeMinutes: number): number[] {
  const rows: number[] = [];
  for (let m = openMinutes; m < closeMinutes; m += 15) rows.push(m);
  return rows;
}

export const overlaps = (a: BusyInterval, b: BusyInterval) => a.startMin < b.endMin && b.startMin < a.endMin;
