'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginAction, type FormState } from '@backend/actions/auth'

export function LoginForm() {
  const t = useTranslations('auth')
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {})

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t('password')}</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error === 'tooMany' ? t('errors.tooMany') : t('loginError')}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {t('loginButton')}
      </Button>
    </form>
  )
}
