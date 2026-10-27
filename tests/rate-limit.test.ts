import { beforeEach, describe, expect, test } from 'vitest'
import { clientIp } from '@backend/lib/client-ip'
import { checkRateLimit, rateLimitSize, resetRateLimits } from '@backend/lib/rate-limit'

beforeEach(resetRateLimits)

const MIN = 60_000

describe('checkRateLimit', () => {
  test('5 tentativi consentiti per default, il 6° negato con retryAfterMs > 0', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 5; i++) expect(checkRateLimit('k', undefined, t0 + i).allowed).toBe(true)
    const denied = checkRateLimit('k', undefined, t0 + 10)
    expect(denied.allowed).toBe(false)
    expect(denied.retryAfterMs).toBeGreaterThan(0)
    expect(denied.retryAfterMs).toBeLessThanOrEqual(15 * MIN)
  })

  test('dopo la finestra (15 minuti) è di nuovo consentito', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 5; i++) checkRateLimit('k', undefined, t0)
    expect(checkRateLimit('k', undefined, t0 + 1).allowed).toBe(false)
    expect(checkRateLimit('k', undefined, t0 + 15 * MIN + 1).allowed).toBe(true)
  })

  test('i tentativi negati non allungano il blocco', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 5; i++) checkRateLimit('k', undefined, t0)
    for (let i = 0; i < 20; i++) checkRateLimit('k', undefined, t0 + 5 * MIN)
    expect(checkRateLimit('k', undefined, t0 + 15 * MIN + 1).allowed).toBe(true)
  })

  test('chiavi indipendenti e limiti personalizzati', () => {
    const t0 = 1_000_000
    const opts = { max: 2, windowMs: MIN }
    expect(checkRateLimit('a', opts, t0).allowed).toBe(true)
    expect(checkRateLimit('a', opts, t0).allowed).toBe(true)
    expect(checkRateLimit('a', opts, t0).allowed).toBe(false)
    expect(checkRateLimit('b', opts, t0).allowed).toBe(true)
  })
})

describe('memoria del limiter', () => {
  test('la mappa ha un tetto: chiavi in eccesso vengono scartate, quelle recenti restano limitate', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 6000; i++) checkRateLimit(`casuale-${i}`, undefined, t0 + i)
    for (let i = 0; i < 5; i++) checkRateLimit('bersaglio', undefined, t0 + 6000 + i)
    expect(rateLimitSize()).toBeLessThanOrEqual(5000)
    // Il bersaglio è tra le chiavi più recenti: resta contato e quindi negato.
    expect(checkRateLimit('bersaglio', undefined, t0 + 7000).allowed).toBe(false)
  })
})

describe('clientIp', () => {
  test('senza proxy fidati (0 hop) l\'IP non è affidabile: null', () => {
    expect(clientIp('1.2.3.4', 0)).toBeNull()
    expect(clientIp(null, 1)).toBeNull()
  })

  test('con N proxy fidati si prende la N-esima voce da destra, non quella scritta dal client', () => {
    expect(clientIp('6.6.6.6, 1.2.3.4', 1)).toBe('1.2.3.4')
    expect(clientIp('6.6.6.6, 1.2.3.4, 10.0.0.1', 2)).toBe('1.2.3.4')
    expect(clientIp(' 1.2.3.4 ', 1)).toBe('1.2.3.4')
  })

  test('meno voci degli hop dichiarati o hop non validi → null', () => {
    expect(clientIp('1.2.3.4', 2)).toBeNull()
    expect(clientIp('1.2.3.4', -1)).toBeNull()
    expect(clientIp('1.2.3.4', Number.NaN)).toBeNull()
  })
})
