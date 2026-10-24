import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AppShell } from '@/components/AppShell'
import { AdminNav, type AdminNavItem } from '@/components/AdminNav'
import { requireMember } from '@/lib/auth'
import { runLazyNotifications } from '@/lib/lazy-notifications'

export default async function AdminLayout({ children }: LayoutProps<'/[locale]/admin'>) {
  const user = await requireMember()
  if (!user.isAdmin) notFound() // l'area admin non rivela la propria esistenza ai soci
  await runLazyNotifications(user.id)
  const t = await getTranslations('admin.nav')
  const items: AdminNavItem[] = [
    { href: '/admin/dashboard', label: t('dashboard') },
    { href: '/admin/members', label: t('members') },
    { href: '/admin/bookings', label: t('bookings') },
    { href: '/admin/payments', label: t('payments') },
    { href: '/admin/fields', label: t('fields') },
    { href: '/admin/settings', label: t('settings') },
  ]

  return (
    <AppShell user={user}>
      <AdminNav items={items} />
      {children}
    </AppShell>
  )
}
