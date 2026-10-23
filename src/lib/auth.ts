// Autenticazione (Auth.js, credenziali, sessione JWT) e guardie di autorizzazione lato server.
// Il JWT contiene solo l'id: ruolo e lingua si leggono dal database a ogni richiesta, così un cambio
// di ruolo o un "reimposta accesso" dell'admin ha effetto subito.
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { verifyCredentials } from '@/lib/members'
import { isSessionCurrent } from '@/lib/session-version'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = z.object({ email: z.string(), password: z.string() }).safeParse(raw)
        if (!parsed.success) return null
        return verifyCredentials(parsed.data.email, parsed.data.password)
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id
        token.sv = (user as { sessionVersion?: number }).sessionVersion
      }
      return token
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      ;(session.user as { sessionVersion?: unknown }).sessionVersion = token.sv
      return session
    },
  },
})

export type SessionUser = { id: string; isAdmin: boolean; locale: 'it' | 'en' }

export class ForbiddenError extends Error {
  constructor() {
    super('FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

/** Utente della sessione corrente, riletto dal database; null se non autenticato o account non attivo. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return null
  const tokenVersion = (session.user as { sessionVersion?: unknown }).sessionVersion
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, isAdmin: true, locale: true, activatedAt: true, sessionVersion: true },
  })
  if (!user || !user.activatedAt) return null
  // Token emesso prima di un "reimposta accesso" (o senza versione): non vale più.
  if (!isSessionCurrent(tokenVersion, user.sessionVersion)) return null
  return { id: user.id, isAdmin: user.isAdmin, locale: user.locale === 'en' ? 'en' : 'it' }
}

/** Prima istruzione di ogni pagina/azione riservata ai soci (e agli admin). */
export async function requireMember(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return user
}

/** Prima istruzione di ogni pagina/azione riservata agli admin. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireMember()
  if (!user.isAdmin) throw new ForbiddenError()
  return user
}
