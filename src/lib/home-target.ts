import type { SessionUser } from '@/lib/auth'

/** Dove porta la home: calendario nella lingua salvata sul profilo (se autenticato), altrimenti login. */
export function homeTarget(
  user: Pick<SessionUser, 'locale'> | null,
  urlLocale: string,
): { href: '/calendar' | '/login'; locale: string } {
  return user ? { href: '/calendar', locale: user.locale } : { href: '/login', locale: urlLocale }
}
