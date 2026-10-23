// Login con credenziali: validazione, limite di tentativi e verifica. È ciò che Auth.js esegue in `authorize`,
// quindi il limite vale sia per la pagina di login sia per un POST diretto a /api/auth/callback/credentials.
import { z } from 'zod'
import { verifyCredentials, type SessionIdentity } from '@/lib/members'
import { checkRateLimit } from '@/lib/rate-limit'

export class TooManyAttemptsError extends Error {
  constructor() {
    super('TOO_MANY_ATTEMPTS')
    this.name = 'TooManyAttemptsError'
  }
}

const WINDOW = { windowMs: 15 * 60_000 }
const credentialsSchema = z.object({ email: z.string(), password: z.string() })

/**
 * `ip` è l'IP affidabile del client oppure null (senza proxy fidati dichiarati): in quel caso vale solo
 * il limite per email. Lancia `TooManyAttemptsError` oltre i 10 tentativi per email / 30 per IP ogni 15 minuti.
 */
export async function authorizeCredentials(raw: unknown, ip: string | null): Promise<SessionIdentity | null> {
  const parsed = credentialsSchema.safeParse(raw)
  if (!parsed.success) return null
  const email = parsed.data.email.trim().toLowerCase()
  const perEmail = checkRateLimit(`login:${email}`, { max: 10, ...WINDOW })
  const perIp = ip ? checkRateLimit(`login-ip:${ip}`, { max: 30, ...WINDOW }) : { allowed: true }
  if (!perEmail.allowed || !perIp.allowed) throw new TooManyAttemptsError()
  return verifyCredentials(parsed.data.email, parsed.data.password)
}
