import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import type { FieldInfo, PublicSlot } from '@/lib/availability'
import type { Settings } from '@/lib/booking-rules'
import { fromRome, hhmm, romeMinutesOfDay } from '@/lib/time'
import { cn } from '@/lib/utils'

const ROW_PX = 20 // altezza di un quarto d'ora

type Busy = PublicSlot & { memberName?: string }

/**
 * Griglia giornaliera: una colonna per campo, una riga per quarto d'ora.
 * Sul telefono si vede un solo campo alla volta (selettore); da md in su tutte le colonne.
 */
export async function DayCalendar({
  day,
  fields,
  busy,
  settings,
  selectedFieldId,
  now,
}: {
  day: string
  fields: FieldInfo[]
  busy: Busy[]
  settings: Settings
  selectedFieldId: string
  now: Date
}) {
  const t = await getTranslations('calendar')
  const rows = Math.floor((settings.closeMinutes - settings.openMinutes) / settings.stepMinutes)
  const height = rows * ROW_PX
  const quarterStart = (minutes: number) => fromRome(day, hhmm(minutes))

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-semibold text-muted-foreground" aria-hidden>
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded border bg-card" /> {t('free')}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded border border-destructive/50 bg-destructive/20" /> {t('busy')}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded border bg-muted" /> {t('past')}
        </li>
      </ul>
      <div className="flex flex-wrap items-center gap-2 md:hidden" role="group" aria-label={t('selectField')}>
        {fields.map((f) => (
          <Link
            key={f.id}
            href={{ pathname: '/calendar', query: { day, field: f.id } }}
            aria-current={f.id === selectedFieldId}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
              f.id === selectedFieldId ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-secondary',
            )}
          >
            {f.name}
          </Link>
        ))}
      </div>

      <div className="flex overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <div className="w-12 shrink-0 border-r bg-muted/40 text-xs text-muted-foreground">
          <div className="h-10 border-b bg-primary" />
          <div className="relative" style={{ height }}>
            {Array.from({ length: rows }, (_, i) => settings.openMinutes + i * settings.stepMinutes)
              .filter((m) => m % 60 === 0)
              .map((m) => (
                <span
                  key={m}
                  className="absolute right-1.5 -translate-y-1/2 first:translate-y-0"
                  style={{ top: ((m - settings.openMinutes) / settings.stepMinutes) * ROW_PX }}
                >
                  {hhmm(m)}
                </span>
              ))}
          </div>
        </div>

        {fields.map((f) => {
          const fieldBusy = busy.filter((b) => b.fieldId === f.id)
          return (
            <div
              key={f.id}
              className={cn('min-w-0 flex-1 border-r last:border-r-0 md:min-w-36', f.id !== selectedFieldId && 'hidden md:block')}
            >
              <div className="flex h-10 items-center justify-center border-b bg-primary px-2 font-heading text-base font-bold tracking-wide text-primary-foreground uppercase">
                {f.name}
              </div>
              <div className="relative" style={{ height }}>
                {Array.from({ length: rows }, (_, i) => {
                  const minutes = settings.openMinutes + i * settings.stepMinutes
                  const isPast = quarterStart(minutes).getTime() < now.getTime()
                  const line = minutes % 60 === 0 ? 'border-t border-border' : 'border-t border-dashed border-border/50'
                  return isPast ? (
                    <div key={minutes} className={cn('bg-muted/50', line)} style={{ height: ROW_PX }} title={t('past')} />
                  ) : (
                    <Link
                      key={minutes}
                      href={{ pathname: '/booking/new', query: { fieldId: f.id, day, time: hhmm(minutes) } }}
                      aria-label={t('bookSlot', { field: f.name, time: hhmm(minutes) })}
                      title={`${t('free')} · ${hhmm(minutes)}`}
                      className={cn('block transition-colors hover:bg-accent/70', line)}
                      style={{ height: ROW_PX }}
                    />
                  )
                })}
                {fieldBusy.map((b) => {
                  const start = romeMinutesOfDay(new Date(b.start))
                  const duration = (new Date(b.end).getTime() - new Date(b.start).getTime()) / 60_000
                  return (
                    <div
                      key={`${b.start}-${b.end}`}
                      className="absolute inset-x-0.5 overflow-hidden rounded-md border border-destructive/50 bg-destructive/20 px-1.5 py-0.5 text-xs font-semibold text-destructive"
                      style={{
                        top: ((start - settings.openMinutes) / settings.stepMinutes) * ROW_PX,
                        height: (duration / settings.stepMinutes) * ROW_PX - 1,
                      }}
                    >
                      {b.memberName ?? t('busy')}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
