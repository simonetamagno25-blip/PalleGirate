'use client'

import { useEffect } from 'react'

/** Registra il service worker (solo in produzione: in sviluppo complicherebbe il ricaricamento a caldo). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Senza service worker l'app funziona comunque: si perde solo l'installabilità.
    })
  }, [])
  return null
}
