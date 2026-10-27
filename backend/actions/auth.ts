'use server'

import { headers } from 'next/headers'
import { AuthError, CredentialsSignin } from 'next-auth'
import { signIn } from '@backend/lib/auth'
import { clientIp, trustedProxyHops } from '@backend/lib/client-ip'
import { activateAccount } from '@backend/lib/members'
import { checkRateLimit } from '@backend/lib/rate-limit'

export type FormState = { error?: 'loginError' | 'ACTIVATION_FAILED' | 'WEAK_PASSWORD' | 'tooMany'; ok?: boolean }

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '')

/**
 * Numeri tessera sequenziali = indovinabili: l'attivazione si limita per numero tessera e, se si dichiarano
 * proxy fidati (TRUSTED_PROXY_HOPS), anche per IP. Il limite del login sta in `authorize` (src/lib/login.ts).
 */
async function activationAllowed(membershipNumber: string): Promise<boolean> {
  const perNumber = checkRateLimit(`activate:${membershipNumber.trim().toLowerCase()}`)
  const ip = clientIp((await headers()).get('x-forwarded-for'), trustedProxyHops())
  const perIp = ip ? checkRateLimit(`activate-ip:${ip}`) : { allowed: true }
  return perNumber.allowed && perIp.allowed
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await signIn('credentials', { email: text(formData, 'email'), password: text(formData, 'password'), redirectTo: '/' })
  } catch (e) {
    if (e instanceof CredentialsSignin && e.code === 'too_many') return { error: 'tooMany' }
    if (e instanceof AuthError) return { error: 'loginError' }
    throw e // include il redirect di Next dopo un login riuscito
  }
  return {}
}

export async function activateAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await activationAllowed(text(formData, 'membershipNumber')))) return { error: 'tooMany' }
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
