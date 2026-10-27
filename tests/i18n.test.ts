import { describe, expect, test } from 'vitest'
import { BOOKING_ERROR_CODES } from '@backend/lib/booking-service'
import en from '../frontend/messages/en.json'
import it from '../frontend/messages/it.json'

function flatten(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object') Object.assign(out, flatten(v, key))
    else out[key] = String(v)
  }
  return out
}

const itKeys = flatten(it)
const enKeys = flatten(en)

describe('messaggi IT/EN', () => {
  test('it.json ed en.json hanno lo stesso insieme di chiavi', () => {
    expect(Object.keys(enKeys).sort()).toEqual(Object.keys(itKeys).sort())
  })

  test('ogni codice di errore di prenotazione ha un messaggio in entrambe le lingue', () => {
    for (const code of BOOKING_ERROR_CODES) {
      expect(itKeys, `it: errors.booking.${code}`).toHaveProperty(`errors.booking.${code}`)
      expect(enKeys, `en: errors.booking.${code}`).toHaveProperty(`errors.booking.${code}`)
    }
  })

  test('nessun valore vuoto', () => {
    for (const [key, value] of [...Object.entries(itKeys), ...Object.entries(enKeys)]) {
      expect(value.trim(), key).not.toBe('')
    }
  })
})

describe('segnaposto ICU', () => {
  /** Nomi degli argomenti ICU, anche dentro i rami di plural/select (i rami sono messaggi annidati). */
  function argsOf(msg: string): string[] {
    const names = new Set<string>()
    for (let i = 0; i < msg.length; i++) {
      if (msg[i] !== '{') continue
      let depth = 0
      let j = i
      do {
        if (msg[j] === '{') depth++
        else if (msg[j] === '}') depth--
        j++
      } while (depth > 0 && j < msg.length)
      const inner = msg.slice(i + 1, j - 1)
      names.add(inner.match(/^\s*(\w+)/)![1])
      const parts = inner.split(',')
      if (parts.length > 2) {
        const branches = parts.slice(2).join(',')
        for (const m of branches.matchAll(/\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)) argsOf(m[1]).forEach((n) => names.add(n))
      }
      i = j - 1
    }
    return [...names].sort()
  }

  test('ogni chiave usa gli stessi segnaposto in IT ed EN', () => {
    for (const key of Object.keys(itKeys)) {
      expect(argsOf(enKeys[key]), key).toEqual(argsOf(itKeys[key]))
    }
  })
})
