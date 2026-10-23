import { Bell } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { unreadCount } from '@/lib/notifications'

/** Campanella con il numero di notifiche non lette. */
export async function NotificationBell({ userId }: { userId: string }) {
  const [t, count] = await Promise.all([getTranslations('notifications'), unreadCount(userId)])
  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? t('bellUnread', { count }) : t('bell')}
      className="relative rounded-md p-2 hover:bg-muted"
    >
      <Bell className="size-5" aria-hidden />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
