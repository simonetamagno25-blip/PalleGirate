// Proxy (ex middleware, Next 16): solo instradamento per lingua.
// L'autorizzazione vera sta nelle guardie lato server (`requireMember` / `requireAdmin`), non qui.
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Esclude API, file interni di Next e file statici (qualsiasi percorso con un punto).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
