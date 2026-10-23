import type { MetadataRoute } from 'next'

const THEME_COLOR = '#111827'

/** Manifest PWA: rende l'app installabile ("Aggiungi a schermata Home") su iOS, Android e desktop. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Palle Girate',
    short_name: 'Palle Girate',
    description: 'Prenota i campi del centro sportivo.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: THEME_COLOR,
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512?maskable=1', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
