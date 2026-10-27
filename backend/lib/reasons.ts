// Motivi di cancellazione generati dal sistema: si salvano come codice e si traducono alla visualizzazione.
export const SYSTEM_REASONS = ['AUTO_BLOCK', 'FIELD_DEACTIVATED'] as const

export type SystemReason = (typeof SYSTEM_REASONS)[number]

const isSystemReason = (r: string): r is SystemReason => (SYSTEM_REASONS as readonly string[]).includes(r)

/** Testo da mostrare per il motivo: tradotto se è un codice di sistema, altrimenti il testo libero. */
export function displayReason(reason: string | null, t: (key: string) => string): string | null {
  if (!reason) return null
  return isSystemReason(reason) ? t(`reasons.${reason}`) : reason
}
