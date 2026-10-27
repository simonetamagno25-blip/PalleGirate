'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from '@/i18n/routing'
import { saveFieldAction, setFieldActiveAction, type FieldFormState } from '@backend/actions/admin-fields'

export type FieldDefaults = { name: string; sport: string; slotMinutes: number; price: string }

/** Riga di modifica (o di creazione, con `id` nullo) di un campo. */
export function FieldForm({ id, defaults }: { id: string | null; defaults?: FieldDefaults }) {
  const t = useTranslations('admin.fields')
  const te = useTranslations('errors.booking')
  const [state, formAction, pending] = useActionState<FieldFormState, FormData>(saveFieldAction.bind(null, id), {})

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-[2fr_1.5fr_1fr_1fr_auto]">
        <Input name="name" aria-label={t('name')} placeholder={t('name')} defaultValue={defaults?.name} required />
        <Input name="sport" aria-label={t('sport')} placeholder={t('sport')} defaultValue={defaults?.sport} required />
        <Input
          name="slotMinutes"
          type="number"
          step={15}
          min={15}
          aria-label={t('slotMinutes')}
          placeholder={t('slotMinutes')}
          defaultValue={defaults?.slotMinutes}
          required
        />
        <Input name="price" inputMode="decimal" aria-label={t('price')} placeholder={t('price')} defaultValue={defaults?.price} required />
        <Button type="submit" size="sm" disabled={pending}>
          {id === null ? t('add') : t('save')}
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="text-xs text-destructive">
          {te(state.error as 'INVALID_FIELD')}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-xs text-muted-foreground">
          {t('saved')}
        </p>
      )}
    </form>
  )
}

/** Attiva/disattiva. Se ci sono prenotazioni future chiede conferma prima di cancellarle. */
export function ToggleFieldButton({ id, active, futureCount }: { id: string; active: boolean; futureCount: number }) {
  const t = useTranslations('admin.fields')
  const te = useTranslations('errors.booking')
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const deactivating = active
    if (deactivating && futureCount > 0 && !window.confirm(t('confirmDeactivate', { count: futureCount }))) return
    startTransition(async () => {
      const res = await setFieldActiveAction(id, !active, deactivating && futureCount > 0)
      if (res.ok) {
        setError(null)
        router.refresh()
      } else setError(res.violations[0])
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant={active ? 'outline' : 'secondary'} disabled={pending} onClick={toggle}>
        {active ? t('deactivate') : t('activate')}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {te(error as 'HAS_FUTURE_BOOKINGS')}
        </p>
      )}
    </div>
  )
}
