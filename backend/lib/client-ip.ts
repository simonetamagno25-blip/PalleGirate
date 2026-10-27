// IP del client ricavato da `X-Forwarded-For`. L'header lo scrive anche il client, quindi la voce più a sinistra
// non è affidabile: ogni proxy fidato aggiunge a destra l'indirizzo da cui ha ricevuto la richiesta, perciò
// con N proxy fidati davanti all'app l'IP vero è la N-esima voce contando da destra.

/** `trustedHops` = quanti proxy fidati stanno davanti all'app (0 = nessuno: l'IP non è affidabile → null). */
export function clientIp(forwardedFor: string | null, trustedHops: number): string | null {
  if (!forwardedFor || !Number.isInteger(trustedHops) || trustedHops < 1) return null
  const entries = forwardedFor.split(',').map((e) => e.trim()).filter(Boolean)
  return entries.at(-trustedHops) ?? null
}

/** Da `TRUSTED_PROXY_HOPS` (default 0: senza proxy dichiarati i limiti per IP sono disattivati). */
export function trustedProxyHops(): number {
  const n = Number(process.env.TRUSTED_PROXY_HOPS ?? '0')
  return Number.isInteger(n) && n > 0 ? n : 0
}
