import { getTranslations } from 'next-intl/server'
import { NotificationItem } from '@/components/NotificationItem'
import { Button } from '@/components/ui/button'
import { requireMember } from '@backend/lib/auth'
import { listNotifications } from '@backend/lib/notifications'
import { markAllReadAction } from '@backend/actions/notifications'

export default async function NotificationsPage() {
  const user = await requireMember()
  const [list, t] = await Promise.all([listNotifications(user.id), getTranslations('notifications')])
  const hasUnread = list.some((n) => !n.read)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        {hasUnread && (
          <form action={markAllReadAction}>
            <Button type="submit" variant="secondary">
              {t('markAll')}
            </Button>
          </form>
        )}
      </div>
      {list.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </ul>
      )}
    </div>
  )
}
