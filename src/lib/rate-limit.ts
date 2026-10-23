// Limite di tentativi a finestra scorrevole, in memoria: vale per istanza del server (vedi README).
// Per più istanze o in serverless serve un archivio condiviso (es. Redis) dietro la stessa interfaccia.
export type RateLimit = { allowed: boolean; retryAfterMs: number }

const DEFAULT_LIMIT = { max: 5, windowMs: 15 * 60_000 }

// Tetto alla mappa: chi inventa chiavi a raffica non può far crescere la memoria. Oltre il tetto si scartano
// prima le chiavi scadute e poi le più vecchie, fino all'80%, così la pulizia non pesa su ogni richiesta.
const MAX_KEYS = 5000

const attempts = new Map<string, number[]>()

function trim(now: number, windowMs: number) {
  for (const [k, v] of attempts) if (v.every((t) => t <= now - windowMs)) attempts.delete(k)
  const target = Math.floor(MAX_KEYS * 0.8)
  for (const k of attempts.keys()) {
    if (attempts.size <= target) break
    attempts.delete(k)
  }
}

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
  attempts.delete(key) // reinserita in coda: l'ordine della mappa segue l'ultimo uso
  attempts.set(key, recent)
  if (attempts.size > MAX_KEYS) trim(now, opts.windowMs)
  return { allowed: true, retryAfterMs: 0 }
}

/** Solo per i test. */
export function resetRateLimits(): void {
  attempts.clear()
}

/** Solo per i test. */
export function rateLimitSize(): number {
  return attempts.size
}
