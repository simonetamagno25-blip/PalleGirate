import type { Notification } from '@prisma/client'
import { getFormatter, getTranslations } from 'next-intl/server'
import { markReadAction } from '@/app/[locale]/(app)/notifications/actions'
import { Button } from '@/components/ui/button'
import { displayReason } from '@/lib/reasons'

type Params = Record<string, string | number | boolean | null>

/** I params sono JSON salvato nel DB: se è rotto la notifica si mostra comunque, con valori vuoti. */
function parseParams(raw: string): Params {
  try {
    const v: unknown = JSON.parse(raw)
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Params) : {}
  } catch {
    return {}
  }
}

export async function NotificationItem({ notification }: { notification: Notification }) {
  const [t, format] = await Promise.all([getTranslations(), getFormatter()])
  const p = parseParams(notification.params)
  const start = typeof p.start === 'string' && !Number.isNaN(Date.parse(p.start)) ? new Date(p.start) : null
  const expiresOn = typeof p.expiresOn === 'string' ? new Date(`${p.expiresOn}T12:00:00Z`) : null
  const date = start ?? (expiresOn && !Number.isNaN(expiresOn.getTime()) ? expiresOn : null)
  const values = {
    field: typeof p.fieldName === 'string' ? p.fieldName : '',
    date: date ? format.dateTime(date, { dateStyle: 'full' }) : '',
    time: start ? format.dateTime(start, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '',
    by: typeof p.by === 'string' ? p.by : '',
    daysLeft: typeof p.daysLeft === 'number' ? p.daysLeft : 0,
  }
  const reason = displayReason(typeof p.reason === 'string' ? p.reason : null, (k) => t(k))

  return (
    <li
      className={`flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4 ${
        notification.read ? 'text-muted-foreground' : 'border-primary/40 bg-muted/40'
      }`}
    >
      <div className="flex flex-col gap-1">
        <p className={notification.read ? '' : 'font-medium'}>{t(`notifications.types.${notification.type}`, values)}</p>
        {reason && <p className="text-sm">{t('notifications.reason', { reason })}</p>}
        <p className="text-xs">
          {format.dateTime(notification.createdAt, { dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23' })}
        </p>
      </div>
      {!notification.read && (
        <form action={markReadAction.bind(null, notification.id)}>
          <Button type="submit" size="sm" variant="outline">
            {t('notifications.markRead')}
          </Button>
        </form>
      )}
    </li>
  )
}
