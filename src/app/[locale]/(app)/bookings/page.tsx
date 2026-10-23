import { getFormatter, getTranslations } from 'next-intl/server'
import { CancelBookingButton } from '@/components/CancelBookingButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'
import { requireMember } from '@/lib/auth'
import { listMemberBookings } from '@/lib/booking-queries'
import { canChangeOrCancel } from '@/lib/booking-rules'
import { getSettings } from '@/lib/settings'

export default async function MyBookingsPage() {
  const user = await requireMember()
  const now = new Date()
  const [{ upcoming, history }, settings, t, format] = await Promise.all([
    listMemberBookings(user.id, now),
    getSettings(),
    getTranslations('bookings'),
    getFormatter(),
  ])
  const time = (d: Date) => format.dateTime(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const when = (b: { start: Date; end: Date }) =>
    t('when', { date: format.dateTime(b.start, { dateStyle: 'full' }), start: time(b.start), end: time(b.end) })
  const money = (cents: number) => format.number(cents / 100, { style: 'currency', currency: 'EUR' })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <Button render={<Link href="/booking/new" />}>{t('newBooking')}</Button>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t('upcoming')}</h2>
        {upcoming.length === 0 && <p className="text-muted-foreground">{t('emptyUpcoming')}</p>}
        <ul className="flex flex-col gap-3">
          {upcoming.map((b) => {
            // La finestra delle 2 ore è calcolata qui, sul server: il browser non decide nulla.
            const canChange = canChangeOrCancel(b.start, now, settings)
            return (
              <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4">
                <div>
                  <p className="font-medium">{b.field.name}</p>
                  <p className="text-sm capitalize">{when(b)}</p>
                  <p className="text-sm text-muted-foreground">{money(b.priceCents)}</p>
                  {!canChange && <p className="mt-1 text-xs text-muted-foreground">{t('windowClosed')}</p>}
                </div>
                {canChange && (
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" render={<Link href={`/bookings/${b.id}/edit`} />}>
                        {t('edit')}
                      </Button>
                      <CancelBookingButton bookingId={b.id} />
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t('history')}</h2>
        {history.length === 0 && <p className="text-muted-foreground">{t('emptyHistory')}</p>}
        <ul className="flex flex-col gap-2">
          {history.map((b) => (
            <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3 text-sm">
              <div>
                <p className="font-medium">{b.field.name}</p>
                <p className="capitalize">{when(b)}</p>
                {b.cancelReason && <p className="text-muted-foreground">{t('reason', { reason: b.cancelReason })}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={b.status === 'CANCELLED' ? 'outline' : 'secondary'}>{t(`status.${b.status}`)}</Badge>
                {b.status === 'CANCELLED' && b.chargeable && <Badge variant="destructive">{t('chargeableHint')}</Badge>}
                {(b.status === 'CONFIRMED' || b.chargeable) && <Badge variant="outline">{t(`payment.${b.paymentStatus}`)}</Badge>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
