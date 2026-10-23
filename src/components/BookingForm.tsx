'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useEffect, useState, useTransition } from 'react'
import {
  adminCreateBookingAction,
  adminUpdateBookingAction,
  createBookingAction,
  previewPriceAction,
  updateBookingAction,
} from '@/app/[locale]/(app)/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from '@/i18n/routing'
import type { RuleParams } from '@/lib/booking-rules'
import { hhmm } from '@/lib/time'
import { cn } from '@/lib/utils'

type FieldOption = { id: string; name: string; slotMinutes: number; pricePerSlot: number }

type Props = {
  fields: FieldOption[]
  settings: { openMinutes: number; closeMinutes: number; stepMinutes: number; maxSlots: number }
  minDay: string
  /** Ultimo giorno prenotabile dal socio (l'admin non ha limite). */
  maxDay?: string
  initial: { fieldId: string; day: string; time: string; slots: number; memberId?: string }
  /** Se presente: l'admin prenota per conto di un socio. */
  members?: { id: string; label: string }[]
  /** Se presente: si modifica questa prenotazione invece di crearne una nuova. */
  bookingId?: string
  /** L'admin modifica la prenotazione di un altro socio (azione con poteri admin). */
  asAdmin?: boolean
  doneHref: string
}

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

/** Prenotazione guidata: campo → giorno → orario → durata → riepilogo con prezzo → conferma. */
export function BookingForm({ fields, settings, minDay, maxDay, initial, members, bookingId, asAdmin, doneHref }: Props) {
  const t = useTranslations('booking')
  const te = useTranslations('errors.booking')
  const format = useFormatter()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [fieldId, setFieldId] = useState(initial.fieldId)
  const [day, setDay] = useState(initial.day)
  const [time, setTime] = useState(initial.time)
  const [slots, setSlots] = useState(initial.slots)
  const [memberId, setMemberId] = useState(initial.memberId ?? '')
  const [priceCents, setPriceCents] = useState<number | null>(null)
  const [violations, setViolations] = useState<string[]>([])
  const [params, setParams] = useState<RuleParams | undefined>()

  const field = fields.find((f) => f.id === fieldId) ?? fields[0]
  const duration = slots * field.slotMinutes

  // Orari di inizio che permettono di finire entro la chiusura.
  const times: string[] = []
  for (let m = settings.openMinutes; m + duration <= settings.closeMinutes; m += settings.stepMinutes) times.push(hhmm(m))
  const effectiveTime = times.includes(time) ? time : (times[times.length - 1] ?? time)
  const endTime = hhmm(toMinutes(effectiveTime) + duration)
  const dayDate = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T12:00:00`) : null

  useEffect(() => {
    let ignore = false
    previewPriceAction(fieldId, slots).then((p) => !ignore && setPriceCents(p))
    return () => {
      ignore = true
    }
  }, [fieldId, slots])

  const money = (cents: number) => format.number(cents / 100, { style: 'currency', currency: 'EUR' })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setViolations([])
    startTransition(async () => {
      const form = { fieldId, day, time: effectiveTime, slots }
      const result = bookingId
        ? asAdmin
          ? await adminUpdateBookingAction(bookingId, form)
          : await updateBookingAction(bookingId, form)
        : members
          ? await adminCreateBookingAction({ ...form, memberId })
          : await createBookingAction(form)
      if (result.ok) router.push(doneHref)
      else {
        setViolations(result.violations)
        setParams(result.params)
      }
    })
  }

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-6">
      {members && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="memberId">{t('member')}</Label>
          <select
            id="memberId"
            required
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="" disabled>
              {t('pickMember')}
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{t('field')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {fields.map((f) => (
            <label
              key={f.id}
              className={cn(
                'flex cursor-pointer flex-col rounded-lg border p-3 text-sm',
                f.id === fieldId ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted',
              )}
            >
              <input
                type="radio"
                name="field"
                value={f.id}
                checked={f.id === fieldId}
                onChange={() => setFieldId(f.id)}
                className="sr-only"
              />
              <span className="font-medium">{f.name}</span>
              <span className="text-muted-foreground">{t('slotPrice', { price: money(f.pricePerSlot) })}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="day">{t('day')}</Label>
          <Input id="day" type="date" required value={day} min={minDay} max={maxDay} onChange={(e) => setDay(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="time">{t('time')}</Label>
          <select
            id="time"
            value={effectiveTime}
            onChange={(e) => setTime(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            {times.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{t('duration')}</legend>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: settings.maxSlots }, (_, i) => i + 1).map((n) => (
            <label
              key={n}
              className={cn(
                'cursor-pointer rounded-md border px-4 py-2 text-sm',
                n === slots ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted',
              )}
            >
              <input type="radio" name="slots" checked={n === slots} onChange={() => setSlots(n)} className="sr-only" />
              {t('minutes', { minutes: n * field.slotMinutes })}
            </label>
          ))}
        </div>
      </fieldset>

      <section className="rounded-lg border bg-muted/30 p-4" aria-live="polite">
        <h2 className="mb-2 text-sm font-medium">{t('summary')}</h2>
        <p>{t('summaryText', { field: field.name, start: effectiveTime, end: endTime })}</p>
        {dayDate && <p className="text-sm text-muted-foreground">{format.dateTime(dayDate, { dateStyle: 'full' })}</p>}
        <p className="mt-2 text-lg font-semibold">
          {t('price')}: {priceCents === null ? '…' : money(priceCents)}
        </p>
        <p className="text-xs text-muted-foreground">{t('payAtCenter')}</p>
      </section>

      {violations.length > 0 && (
        <ul role="alert" className="list-disc pl-5 text-sm text-destructive">
          {violations.map((v) => (
            <li key={v}>{te(v as 'OVERLAP', { ...params })}</li>
          ))}
        </ul>
      )}

      <div>
        <Button type="submit" disabled={pending || (members !== undefined && memberId === '')}>
          {bookingId ? t('saveChanges') : t('confirm')}
        </Button>
      </div>
    </form>
  )
}
