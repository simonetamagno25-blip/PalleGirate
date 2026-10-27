'use client'

import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { registerPaymentAction, setNoShowAction } from '@backend/actions/admin-payments'
import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/routing'

type Outcome = 'PAID' | 'UNPAID' | 'EXEMPT'

/** Pulsanti Pagata / Non pagata / Esente (e, se richiesto, l'interruttore no-show) di una prenotazione. */
export function PaymentButtons({
  bookingId,
  outcomes,
  noShow,
}: {
  bookingId: string
  outcomes: Outcome[]
  noShow?: boolean
}) {
  const t = useTranslations('admin.payments')
  const te = useTranslations('errors.booking')
  const router = useRouter()
  const [errors, setErrors] = useState<string[]>([])
  const [pending, startTransition] = useTransition()

  function run(action: () => ReturnType<typeof registerPaymentAction>) {
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        setErrors([])
        router.refresh()
      } else setErrors(result.violations)
    })
  }

  function choose(outcome: Outcome) {
    if (outcome === 'UNPAID' && !window.confirm(t('confirmUnpaid'))) return
    run(() => registerPaymentAction(bookingId, outcome))
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-1.5">
        {outcomes.map((o) => (
          <Button
            key={o}
            size="sm"
            variant={o === 'UNPAID' ? 'destructive' : 'outline'}
            disabled={pending}
            onClick={() => choose(o)}
          >
            {t(`outcome.${o}`)}
          </Button>
        ))}
        {noShow !== undefined && (
          <Button
            size="sm"
            variant={noShow ? 'secondary' : 'ghost'}
            aria-pressed={noShow}
            disabled={pending}
            onClick={() => run(() => setNoShowAction(bookingId, !noShow))}
          >
            {t('noShow')}
          </Button>
        )}
      </div>
      {errors.map((v) => (
        <p key={v} role="alert" className="text-xs text-destructive">
          {te(v as 'OVERLAP')}
        </p>
      ))}
    </div>
  )
}
