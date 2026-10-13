import { describe, expect, test } from 'vitest'
import { BOOKING_ERROR_CODES } from '@/lib/booking-service'
import en from '../messages/en.json'
import it from '../messages/it.json'

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
