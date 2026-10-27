import type { SessionUser } from '@backend/lib/auth'

/** Dove porta la home: dashboard nella lingua salvata sul profilo (se autenticato), altrimenti login. */
export function homeTarget(
  user: Pick<SessionUser, 'locale'> | null,
  urlLocale: string,
): { href: '/dashboard' | '/login'; locale: string } {
  return user ? { href: '/dashboard', locale: user.locale } : { href: '/login', locale: urlLocale }
}
