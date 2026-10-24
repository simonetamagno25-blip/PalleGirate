import type { MetadataRoute } from 'next'

const THEME_COLOR = '#003826' // verde del logo

/** Manifest PWA: rende l'app installabile ("Aggiungi a schermata Home") su iOS, Android e desktop. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Palle Girate',
    short_name: 'Palle Girate',
    description: 'Prenota i campi del centro sportivo.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fbf6e6', // crema delle icone
    theme_color: THEME_COLOR,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
