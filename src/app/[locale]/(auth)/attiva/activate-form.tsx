'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link } from '@/i18n/routing'
import { activateAction, type FormState } from '../actions'

export function ActivateForm() {
  const t = useTranslations('auth')
  const [state, action, pending] = useActionState<FormState, FormData>(activateAction, {})

  if (state.ok) {
    return (
      <div className="flex flex-col gap-3">
        <p role="status">{t('activateSuccess')}</p>
        <Button render={<Link href="/login" />}>{t('loginButton')}</Button>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t('activateIntro')}</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="membershipNumber">{t('membershipNumber')}</Label>
        <Input id="membershipNumber" name="membershipNumber" autoComplete="off" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t('newPassword')}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state.error && state.error !== 'loginError' && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {t('activateButton')}
      </Button>
    </form>
  )
}
