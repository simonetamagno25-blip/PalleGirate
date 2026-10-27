import { getFormatter, getTranslations } from 'next-intl/server'
import { BarSeriesChart } from '@/components/charts/BarSeriesChart'
import { CancelBookingButton } from '@/components/CancelBookingButton'
import { KpiCard } from '@/components/KpiCard'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'
import { requireMember } from '@backend/lib/auth'
import { canChangeOrCancel } from '@backend/lib/booking-rules'
import { prisma } from '@backend/lib/db'
import { getSettings } from '@backend/lib/settings'
import { getMemberDashboard } from '@backend/lib/stats-member'

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default async function MemberDashboardPage() {
  const user = await requireMember()
  const now = new Date()
  const [d, person, settings, t, tb, format] = await Promise.all([
    getMemberDashboard(user.id, now),
    prisma.user.findUnique({ where: { id: user.id }, select: { firstName: true } }),
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
      <section className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-md sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-64 rounded-full bg-accent/30 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -right-8 -bottom-20 size-56 rounded-full bg-chart-2/40 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold tracking-widest text-accent uppercase">{t('title')}</p>
            <h1 className="mt-1 text-4xl sm:text-5xl">{t('greeting', { name: person?.firstName ?? '' })}</h1>
            <p className="mt-1 text-primary-foreground/80">{t('tagline')}</p>
          </div>
          <Button variant="accent" className="h-11 px-5 text-base" render={<Link href="/booking/new" />}>
            {tb('newBooking')}
          </Button>
        </div>
      </section>

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
              <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
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
        <div className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm">
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
        <div className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm">
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
