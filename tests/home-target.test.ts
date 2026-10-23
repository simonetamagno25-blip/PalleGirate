import { describe, expect, test } from 'vitest'
import { homeTarget } from '@/lib/home-target'

describe('homeTarget', () => {
  test('senza sessione: login nella lingua dell\'URL', () => {
    expect(homeTarget(null, 'en')).toEqual({ href: '/login', locale: 'en' })
  })

  test('con sessione: calendario nella lingua salvata sul profilo, non in quella dell\'URL', () => {
    expect(homeTarget({ locale: 'en' }, 'it')).toEqual({ href: '/calendar', locale: 'en' })
    expect(homeTarget({ locale: 'it' }, 'en')).toEqual({ href: '/calendar', locale: 'it' })
  })
})
