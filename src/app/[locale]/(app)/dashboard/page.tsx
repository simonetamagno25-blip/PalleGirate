import { getFormatter, getTranslations } from 'next-intl/server'
import { BarSeriesChart } from '@/components/charts/BarSeriesChart'
import { CancelBookingButton } from '@/components/CancelBookingButton'
import { KpiCard } from '@/components/KpiCard'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'
import { requireMember } from '@/lib/auth'
import { canChangeOrCancel } from '@/lib/booking-rules'
import { getSettings } from '@/lib/settings'
import { getMemberDashboard } from '@/lib/stats-member'

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default async function MemberDashboardPage() {
  const user = await requireMember()
  const now = new Date()
  const [d, settings, t, tb, format] = await Promise.all([
    getMemberDashboard(user.id, now),
    getSettings(),
    getTranslations('dashboard'),
    getTranslations('bookings'),
    getFormatter(),
  ])
  const time = (x: Date) => format.dateTime(x, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const money = (cents: number) => format.number(cents / 100, { style: 'currency', currency: 'EUR' })

  const membershipValue = !d.membership ? t('noMembership') : d.membership.daysLeft < 0 ? t('expired') : t('daysLeft', { days: d.membership.daysLeft })
  const membershipHint = d.membership ? t('membershipHint', { number: d.membership.number, date: format.dateTime(d.membership.expiresAt, { dateStyle: 'medium' }) }) : undefined
  const expiredOrExpiring = d.membership !== null && d.membership.daysLeft <= settings.membershipWarnDays

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <Button render={<Link href="/booking/new" />}>{tb('newBooking')}</Button>
      </div>

      {d.blocked && (
        <div role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <p className="font-medium">{t('blockedTitle')}</p>
          <p>{t('blockedText', { amount: money(d.debtCents) })}</p>
        </div>
      )}

      <section aria-label={t('kpis')} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={t('active')} value={`${d.activeCount}/${d.maxActive}`} hint={t('activeHint')} tone={d.activeCount >= d.maxActive ? 'warning' : 'default'} />
        <KpiCard label={t('membership')} value={membershipValue} hint={membershipHint} tone={expiredOrExpiring ? 'warning' : 'default'} />
        <KpiCard label={t('due')} value={money(d.debtCents)} hint={t('dueHint')} tone={d.debtCents > 0 ? 'warning' : 'default'} />
        <KpiCard label={t('strikes')} value={d.strikes} hint={t('strikesHint')} tone={d.strikes > 0 ? 'warning' : 'default'} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t('upcoming')}</h2>
        {d.upcoming.length === 0 && <p className="text-muted-foreground">{tb('emptyUpcoming')}</p>}
        <ul className="flex flex-col gap-3">
          {d.upcoming.map((b) => {
            // La finestra di modifica è calcolata qui, sul server: il browser non decide nulla.
            const canChange = canChangeOrCancel(b.start, now, settings)
            return (
              <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4">
                <div>
                  <p className="font-medium">{b.field.name}</p>
                  <p className="text-sm capitalize">
                    {tb('when', { date: format.dateTime(b.start, { dateStyle: 'full' }), start: time(b.start), end: time(b.end) })}
                  </p>
                  <p className="text-sm text-muted-foreground">{money(b.priceCents)}</p>
                  {!canChange && <p className="mt-1 text-xs text-muted-foreground">{tb('windowClosed', { hours: settings.changeWindowHours })}</p>}
                </div>
                {canChange && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" render={<Link href={`/bookings/${b.id}/edit`} />}>
                      {tb('edit')}
                    </Button>
                    <CancelBookingButton bookingId={b.id} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-medium">{t('hoursBySport')}</h2>
          {d.hoursBySport.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noData')}</p>
          ) : (
            <BarSeriesChart
              data={d.hoursBySport.map((h) => ({ label: capitalize(h.sport), value: h.hours }))}
              seriesLabel={t('hoursSeries')}
              color="var(--chart-2)"
              decimals={1}
            />
          )}
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-medium">{t('bookingsByMonth')}</h2>
          {d.bookingsByMonth.every((m) => m.count === 0) ? (
            <p className="text-sm text-muted-foreground">{t('noData')}</p>
          ) : (
            <BarSeriesChart
              data={d.bookingsByMonth.map((m) => ({
                label: format.dateTime(new Date(`${m.month}-15T12:00:00Z`), { month: 'short' }),
                value: m.count,
              }))}
              seriesLabel={t('bookingsSeries')}
            />
          )}
        </div>
      </section>
    </div>
  )
}
