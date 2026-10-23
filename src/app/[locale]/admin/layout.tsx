import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AppShell } from '@/components/AppShell'
import { Link } from '@/i18n/routing'
import { requireMember } from '@/lib/auth'
import { runLazyNotifications } from '@/lib/lazy-notifications'

export default async function AdminLayout({ children }: LayoutProps<'/[locale]/admin'>) {
  const user = await requireMember()
  if (!user.isAdmin) notFound() // l'area admin non rivela la propria esistenza ai soci
  await runLazyNotifications(user.id)
  const t = await getTranslations('admin.nav')

  return (
    <AppShell user={user}>
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b pb-3 text-sm">
        <Link href="/admin/dashboard" className="rounded-md px-3 py-1.5 hover:bg-muted">
          {t('dashboard')}
        </Link>
        <Link href="/admin/members" className="rounded-md px-3 py-1.5 hover:bg-muted">
          {t('members')}
        </Link>
        <Link href="/admin/bookings" className="rounded-md px-3 py-1.5 hover:bg-muted">
          {t('bookings')}
        </Link>
        <Link href="/admin/payments" className="rounded-md px-3 py-1.5 hover:bg-muted">
          {t('payments')}
        </Link>
        <Link href="/admin/fields" className="rounded-md px-3 py-1.5 hover:bg-muted">
          {t('fields')}
        </Link>
        <Link href="/admin/settings" className="rounded-md px-3 py-1.5 hover:bg-muted">
          {t('settings')}
        </Link>
      </nav>
      {children}
    </AppShell>
  )
}
