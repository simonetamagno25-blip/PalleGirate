'use server'

import { AuthError } from 'next-auth'
import { signIn } from '@/lib/auth'
import { activateAccount } from '@/lib/members'

export type FormState = { error?: 'loginError' | 'ACTIVATION_FAILED' | 'WEAK_PASSWORD'; ok?: boolean }

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '')

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await signIn('credentials', { email: text(formData, 'email'), password: text(formData, 'password'), redirectTo: '/' })
  } catch (e) {
    if (e instanceof AuthError) return { error: 'loginError' }
    throw e // include il redirect di Next dopo un login riuscito
  }
  return {}
}

export async function activateAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
