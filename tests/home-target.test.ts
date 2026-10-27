import { describe, expect, test } from 'vitest'
import { homeTarget } from '@backend/lib/home-target'

describe('homeTarget', () => {
  test('senza sessione: login nella lingua dell\'URL', () => {
    expect(homeTarget(null, 'en')).toEqual({ href: '/login', locale: 'en' })
  })

  test('con sessione: dashboard nella lingua salvata sul profilo, non in quella dell\'URL', () => {
    expect(homeTarget({ locale: 'en' }, 'it')).toEqual({ href: '/dashboard', locale: 'en' })
    expect(homeTarget({ locale: 'it' }, 'en')).toEqual({ href: '/dashboard', locale: 'it' })
  })
})
