import { beforeEach, describe, expect, test } from 'vitest'
import { checkRateLimit, resetRateLimits } from '@/lib/rate-limit'

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
