'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateSettingsAction, type SettingsFormState } from './actions'

export type SettingsDefaults = {
  open: string
  close: string
  stepMinutes: number
  maxAdvanceDays: number
  maxActiveBookings: number
  changeWindowHours: number
  maxSlotsPerBooking: number
  membershipWarnDays: number
  reminderHours: number
}

const NUMBER_FIELDS = [
  'maxAdvanceDays',
  'maxActiveBookings',
  'changeWindowHours',
  'maxSlotsPerBooking',
  'membershipWarnDays',
  'reminderHours',
] as const

export function SettingsForm({ defaults }: { defaults: SettingsDefaults }) {
  const t = useTranslations('admin.settings')
  const te = useTranslations('errors.booking')
  const tc = useTranslations('common')
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(updateSettingsAction, {})

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="open">{t('open')}</Label>
          <Input id="open" name="open" type="time" defaultValue={defaults.open} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="close">{t('close')}</Label>
          <Input id="close" name="close" type="time" defaultValue={defaults.close} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stepMinutes">{t('stepMinutes')}</Label>
          <select
            id="stepMinutes"
            name="stepMinutes"
            defaultValue={defaults.stepMinutes}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            {[15, 30, 60].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {NUMBER_FIELDS.map((name) => (
          <div key={name} className="flex flex-col gap-1.5">
            <Label htmlFor={name}>{t(name)}</Label>
            <Input id={name} name={name} type="number" step={1} min={0} defaultValue={defaults[name]} required />
            <p className="text-xs text-muted-foreground">{t(`${name}Hint`)}</p>
          </div>
        ))}
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {te(state.error as 'INVALID_SETTINGS')}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-sm text-muted-foreground">
          {t('saved')}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {tc('save')}
        </Button>
      </div>
    </form>
  )
}
