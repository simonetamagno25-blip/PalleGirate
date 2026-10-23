import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import manifest from '@/app/manifest'

// Il proxy non si importa nei test (next-intl/middleware vuole l'ambiente Next): si legge il matcher dal sorgente.
// Come in Next, il matcher è un'espressione regolare ancorata sul percorso intero.
const proxySource = readFileSync(path.join(import.meta.dirname, '..', 'src', 'proxy.ts'), 'utf8')
const literal = /matcher:\s*\[\s*('(?:[^'\\]|\\.)*')/.exec(proxySource)![1]
const matcher: string = new Function(`return ${literal}`)()
const matches = (pathname: string) => new RegExp(`^${matcher}$`).test(pathname)

describe('manifest PWA', () => {
  const m = manifest()

  test('è installabile: standalone, start_url, nome e colori', () => {
    expect(m.display).toBe('standalone')
    expect(m.start_url).toBe('/')
    expect(m.name).toBe('Palle Girate')
    expect(m.short_name).toBe('Palle Girate')
    expect(m.background_color).toBeTruthy()
    expect(m.theme_color).toBeTruthy()
  })

  test('ha icone 192 e 512 (any) e una 512 maskable, tutte PNG servite da /pwa-icon', () => {
    const icons = m.icons ?? []
    const find = (sizes: string, purpose: string) => icons.find((i) => i.sizes === sizes && (i.purpose ?? 'any') === purpose)
    expect(find('192x192', 'any')).toBeDefined()
    expect(find('512x512', 'any')).toBeDefined()
    expect(find('512x512', 'maskable')).toBeDefined()
    for (const i of icons) {
      expect(i.type).toBe('image/png')
      expect(i.src).toMatch(/^\/pwa-icon\/(192|512)/)
    }
  })
})

describe('proxy', () => {
  test('non intercetta service worker, manifest e icone', () => {
    expect(matches('/sw.js')).toBe(false)
    expect(matches('/manifest.webmanifest')).toBe(false)
    expect(matches('/pwa-icon/192')).toBe(false)
    expect(matches('/pwa-icon/512')).toBe(false)
  })

  test('intercetta le pagine localizzate e la radice', () => {
    expect(matches('/it/calendar')).toBe(true)
    expect(matches('/en/admin/dashboard')).toBe(true)
    expect(matches('/')).toBe(true)
  })
})

describe('service worker', () => {
  const sw = readFileSync(path.join(import.meta.dirname, '..', 'public', 'sw.js'), 'utf8')

  test.each(['install', 'activate', 'fetch'])('ascolta l\'evento %s', (event) => {
    expect(sw).toContain(`addEventListener('${event}'`)
  })

  test('non mette nulla in cache: l\'uso offline non è richiesto', () => {
    expect(sw).not.toContain('caches.')
  })
})
