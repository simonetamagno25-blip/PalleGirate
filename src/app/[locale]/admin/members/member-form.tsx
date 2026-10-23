'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link } from '@/i18n/routing'
import type { MemberFormState } from './actions'

export type MemberDefaults = {
  firstName?: string
  lastName?: string
  birthDate?: string
  email?: string
  phone?: string
  membershipNumber?: string
  issuedAt?: string
  expiresAt?: string
}

type Props = {
  action: (prev: MemberFormState, formData: FormData) => Promise<MemberFormState>
  defaults?: MemberDefaults
  /** false per un utente senza tessera (es. l'admin del seed): i campi tessera non si mostrano. */
  hasMembership?: boolean
  isNew?: boolean
}

export function MemberForm({ action, defaults = {}, hasMembership = true, isNew = false }: Props) {
  const t = useTranslations('admin.members')
  const tc = useTranslations('common')
  const [state, formAction, pending] = useActionState<MemberFormState, FormData>(action, {})

  const field = (name: keyof MemberDefaults, label: string, opts: { type?: string; required?: boolean; hint?: string } = {}) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={opts.type ?? 'text'} defaultValue={defaults[name] ?? ''} required={opts.required ?? true} />
      {opts.hint && <p className="text-xs text-muted-foreground">{opts.hint}</p>}
    </div>
  )

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {field('firstName', t('form.firstName'))}
        {field('lastName', t('form.lastName'))}
        {field('birthDate', t('form.birthDate'), { type: 'date' })}
        {field('phone', t('form.phone'), { type: 'tel' })}
      </div>
      {field('email', t('form.email'), { type: 'email' })}
      {hasMembership ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {field('membershipNumber', t('form.membershipNumber'))}
          {field('issuedAt', t('form.issuedAt'), { type: 'date', required: isNew })}
          {field('expiresAt', t('form.expiresAt'), { type: 'date', required: false, hint: isNew ? t('form.expiresAtHint') : undefined })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('form.noCardHint')}</p>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {tc('save')}
        </Button>
        <Button variant="outline" render={<Link href="/admin/members" />}>
          {tc('cancel')}
        </Button>
      </div>
    </form>
  )
}
