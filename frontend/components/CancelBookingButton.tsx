'use client'

import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { adminCancelBookingAction, cancelBookingAction } from '@backend/actions/bookings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from '@/i18n/routing'
import type { RuleParams } from '@backend/lib/booking-rules'

/** "Cancella" con motivo: il socio può lasciarlo vuoto, l'admin lo trova precompilato (consigliato). */
export function CancelBookingButton({
  bookingId,
  admin = false,
  defaultReason = '',
}: {
  bookingId: string
  admin?: boolean
  defaultReason?: string
}) {
  const t = useTranslations('bookings')
  const te = useTranslations('errors.booking')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(defaultReason)
  const [violations, setViolations] = useState<string[]>([])
  const [params, setParams] = useState<RuleParams | undefined>()
  const [pending, startTransition] = useTransition()

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {t('cancel')}
      </Button>
    )
  }

  function confirm() {
    startTransition(async () => {
      const result = admin ? await adminCancelBookingAction(bookingId, reason) : await cancelBookingAction(bookingId, reason)
      if (result.ok) router.refresh()
      else {
        setViolations(result.violations)
        setParams(result.params)
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-2 text-left">
      <Label htmlFor={`reason-${bookingId}`} className="text-xs">
        {t('cancelReasonLabel')}
      </Label>
      <Input id={`reason-${bookingId}`} value={reason} onChange={(e) => setReason(e.target.value)} />
      {violations.map((v) => (
        <p key={v} role="alert" className="text-xs text-destructive">
          {te(v as 'OVERLAP', { ...params })}
        </p>
      ))}
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" disabled={pending} onClick={confirm}>
          {t('cancelConfirm')}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
          {t('cancelKeep')}
        </Button>
      </div>
    </div>
  )
}
