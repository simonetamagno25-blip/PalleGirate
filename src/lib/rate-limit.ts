// Limite di tentativi a finestra scorrevole, in memoria: vale per istanza del server (vedi README).
// Per più istanze o serverless serve un archivio condiviso (es. Redis) dietro la stessa interfaccia.
export type RateLimit = { allowed: boolean; retryAfterMs: number }

const DEFAULT_LIMIT = { max: 5, windowMs: 15 * 60_000 }

const attempts = new Map<string, number[]>()

/** Registra un tentativo per `key`; se i tentativi nella finestra hanno già raggiunto `max` lo nega (senza registrarlo). */
export function checkRateLimit(
  key: string,
  opts: { max: number; windowMs: number } = DEFAULT_LIMIT,
  now: number = Date.now(),
): RateLimit {
  const recent = (attempts.get(key) ?? []).filter((t) => t > now - opts.windowMs)
  if (recent.length >= opts.max) {
    attempts.set(key, recent)
    return { allowed: false, retryAfterMs: recent[0] + opts.windowMs - now }
  }
  recent.push(now)
  attempts.set(key, recent)
  // Pulizia occasionale delle chiavi scadute, così la mappa non cresce senza limite.
  if (attempts.size > 5000) {
    for (const [k, v] of attempts) if (v.every((t) => t <= now - opts.windowMs)) attempts.delete(k)
  }
  return { allowed: true, retryAfterMs: 0 }
}

/** Solo per i test. */
export function resetRateLimits(): void {
  attempts.clear()
}
