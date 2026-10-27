import { getFormatter, getTranslations } from 'next-intl/server'
import { DayCalendar } from '@/components/DayCalendar'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'
import { requireMember } from '@backend/lib/auth'
import { getDayAvailability } from '@backend/lib/availability'
import { getSettings } from '@backend/lib/settings'
import { addDays, fromRome, isValidDay, romeDay } from '@backend/lib/time'

export default async function CalendarPage({ searchParams }: PageProps<'/[locale]/calendar'>) {
  const user = await requireMember()
  const sp = await searchParams
  const now = new Date()
  const today = romeDay(now)
  const day = typeof sp.day === 'string' && isValidDay(sp.day) ? sp.day : today

  const [settings, availability, t, format] = await Promise.all([
    getSettings(),
    user.isAdmin ? getDayAvailability(day, { admin: true }) : getDayAvailability(day, { admin: false }),
    getTranslations('calendar'),
    getFormatter(),
  ])
  const { fields, busy } = availability
  const selectedFieldId = fields.find((f) => f.id === sp.field)?.id ?? fields[0]?.id ?? ''
  const nav = (d: string) => ({ pathname: '/calendar' as const, query: { day: d, field: selectedFieldId } })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href={nav(addDays(day, -1))} aria-label={t('prevDay')} />}>
            ←
          </Button>
          <Button variant="outline" size="sm" render={<Link href={nav(today)} />}>
            {t('today')}
          </Button>
          <Button variant="outline" size="sm" render={<Link href={nav(addDays(day, 1))} aria-label={t('nextDay')} />}>
            →
          </Button>
        </div>
      </div>
      <p className="text-lg capitalize">{format.dateTime(fromRome(day, '12:00'), { dateStyle: 'full' })}</p>
      <p className="text-sm text-muted-foreground">{t('hint')}</p>
      <DayCalendar day={day} fields={fields} busy={busy} settings={settings} selectedFieldId={selectedFieldId} now={now} />
    </div>
  )
}
