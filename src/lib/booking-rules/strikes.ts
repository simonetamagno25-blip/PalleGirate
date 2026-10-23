/** Stato derivato: gli strike non si azzerano mai, lo sblocco avviene saldando tutti gli insoluti. */
export function isBlocked(strikeCount: number, unpaidCount: number): boolean {
  return strikeCount >= 2 && unpaidCount > 0;
}

export function strikeConsequence(strikeCountAfter: number): "WARNING" | "BLOCK" {
  return strikeCountAfter <= 1 ? "WARNING" : "BLOCK";
}
