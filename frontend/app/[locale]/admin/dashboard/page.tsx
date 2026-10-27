import { getFormatter, getTranslations } from 'next-intl/server'
import { BarSeriesChart } from '@/components/charts/BarSeriesChart'
import { Heatmap } from '@/components/charts/Heatmap'
import { LineSeriesChart } from '@/components/charts/LineSeriesChart'
import { KpiCard } from '@/components/KpiCard'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/i18n/routing'
import { requireAdmin } from '@backend/lib/auth'
import { getSettings } from '@backend/lib/settings'
import { getAdminDashboard, RANGES, type Range } from '@backend/lib/stats-admin'

export default async function AdminDashboardPage({ searchParams }: PageProps<'/[locale]/admin/dashboard'>) {
  const admin = await requireAdmin()
  const sp = await searchParams
  const range: Range = RANGES.find((r) => r === sp.range) ?? 'week'
  const [d, settings, t, format] = await Promise.all([
    getAdminDashboard(admin, range),
    getSettings(),
    getTranslations('admin.dashboard'),
    getFormatter(),
  ])
  const money = (cents: number) => format.number(cents / 100, { style: 'currency', currency: 'EUR' })
  const percent = (ratio: number) => format.number(ratio, { style: 'percent', maximumFractionDigits: 0 })

  const avgOccupancy = d.occupancy.length === 0 ? 0 : d.occupancy.reduce((sum, o) => sum + o.ratio, 0) / d.occupancy.length
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    format.dateTime(new Date(Date.UTC(2026, 9, 12 + i, 12)), { weekday: 'short', timeZone: 'UTC' }),
  )
  const firstHour = Math.floor(settings.openMinutes / 60)
  const lastHour = Math.ceil(settings.closeMinutes / 60) - 1
  const hours = Array.from({ length: Math.max(0, lastHour - firstHour + 1) }, (_, i) => firstHour + i)
  const counts = Object.fromEntries(d.popularSlots.map((c) => [`${c.weekday}-${c.hour}`, c.count]))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <nav aria-label={t('range.label')} className="flex gap-1">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={r === range ? 'default' : 'outline'}
              aria-current={r === range ? 'true' : undefined}
              render={<Link href={{ pathname: '/admin/dashboard', query: { range: r } }} />}
            >
              {t(`range.${r}`)}
            </Button>
          ))}
        </nav>
      </div>

      <section aria-label={t('kpis')} className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label={t('occupancy')} value={percent(avgOccupancy)} hint={t('occupancyHint')} />
        <KpiCard label={t('collected')} value={money(d.revenue.collectedCents)} hint={t('collectedHint', { expected: money(d.revenue.expectedCents) })} />
        <KpiCard label={t('unpaid')} value={money(d.revenue.unpaidCents)} hint={t('unpaidHint')} tone={d.revenue.unpaidCents > 0 ? 'warning' : 'default'} />
        <KpiCard label={t('noShows')} value={d.noShows} hint={t('noShowsHint')} />
        <KpiCard label={t('blocked')} value={d.blockedMembers} hint={t('blockedHint')} tone={d.blockedMembers > 0 ? 'warning' : 'default'} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-medium">{t('occupancyByField')}</h2>
          {d.occupancy.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noData')}</p>
          ) : (
            <BarSeriesChart
              data={d.occupancy.map((o) => ({ label: o.name, value: Math.round(o.ratio * 100) }))}
              seriesLabel={t('occupancy')}
              valueSuffix="%"
            />
          )}
        </div>
        <div className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-medium">{t('revenue')}</h2>
          <BarSeriesChart
            data={[
              { label: t('expected'), value: d.revenue.expectedCents / 100, color: 'var(--chart-1)' },
              { label: t('collectedShort'), value: d.revenue.collectedCents / 100, color: 'var(--chart-2)' },
              { label: t('unpaid'), value: d.revenue.unpaidCents / 100, color: 'var(--chart-5)' },
            ]}
            seriesLabel={t('revenue')}
            valueSuffix=" €"
            decimals={2}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-1 font-medium">{t('popular')}</h2>
          <p className="mb-3 text-xs text-muted-foreground">{t('popularHint')}</p>
          <Heatmap
            rows={weekdays}
            hours={hours}
            counts={counts}
            cellLabel={(row, hour, count) => t('cell', { day: row, hour, count })}
          />
        </div>
        <div className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-medium">{t('trend')}</h2>
          <LineSeriesChart
            data={d.trend.map((m) => ({
              label: format.dateTime(new Date(`${m.month}-15T12:00:00Z`), { month: 'short' }),
              value: m.count,
            }))}
            seriesLabel={t('trendSeries')}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t('expiring', { days: settings.membershipWarnDays })}</h2>
        {d.expiringMemberships.length === 0 ? (
          <p className="text-muted-foreground">{t('noExpiring')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('col.member')}</TableHead>
                  <TableHead>{t('col.card')}</TableHead>
                  <TableHead>{t('col.expires')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.expiringMemberships.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell>
                      <Link href={`/admin/members/${m.userId}`} className="font-medium hover:underline">
                        {m.name}
                      </Link>
                    </TableCell>
                    <TableCell>{m.number}</TableCell>
                    <TableCell>{format.dateTime(m.expiresAt, { dateStyle: 'medium' })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
