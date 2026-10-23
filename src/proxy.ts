// Proxy (ex middleware, Next 16): solo instradamento per lingua.
// L'autorizzazione vera sta nelle guardie lato server (`requireMember` / `requireAdmin`), non qui.
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Esclude API, file interni di Next, le icone PWA e i file statici (qualsiasi percorso con un punto:
  // sw.js, manifest.webmanifest, immagini…).
  matcher: ['/((?!api|_next|_vercel|pwa-icon|.*\\..*).*)'],
}
