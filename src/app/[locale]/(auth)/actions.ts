'use server'

import { headers } from 'next/headers'
import { AuthError } from 'next-auth'
import { signIn } from '@/lib/auth'
import { activateAccount } from '@/lib/members'
import { checkRateLimit } from '@/lib/rate-limit'

export type FormState = { error?: 'loginError' | 'ACTIVATION_FAILED' | 'WEAK_PASSWORD' | 'tooMany'; ok?: boolean }

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '')

async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get('x-forwarded-for')
  return forwarded?.split(',')[0].trim() || 'unknown'
}

/** Numeri tessera e email sequenziali/indovinabili: si limitano i tentativi per IP e per chiave. */
async function allowed(scope: 'login' | 'activate', key: string): Promise<boolean> {
  const ip = await clientIp()
  const perKey = checkRateLimit(`${scope}:${key.trim().toLowerCase()}`, scope === 'login' ? { max: 10, windowMs: 15 * 60_000 } : undefined)
  const perIp = checkRateLimit(`${scope}-ip:${ip}`, scope === 'login' ? { max: 30, windowMs: 15 * 60_000 } : undefined)
  return perKey.allowed && perIp.allowed
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await allowed('login', text(formData, 'email')))) return { error: 'tooMany' }
  try {
    await signIn('credentials', { email: text(formData, 'email'), password: text(formData, 'password'), redirectTo: '/' })
  } catch (e) {
    if (e instanceof AuthError) return { error: 'loginError' }
    throw e // include il redirect di Next dopo un login riuscito
  }
  return {}
}

export async function activateAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await allowed('activate', text(formData, 'membershipNumber')))) return { error: 'tooMany' }
  try {
    await activateAccount({
      membershipNumber: text(formData, 'membershipNumber'),
      email: text(formData, 'email'),
      password: text(formData, 'password'),
    })
    return { ok: true }
  } catch (e) {
    const code = (e as Error).message
    if (code === 'ACTIVATION_FAILED' || code === 'WEAK_PASSWORD') return { error: code }
    throw e
  }
}
