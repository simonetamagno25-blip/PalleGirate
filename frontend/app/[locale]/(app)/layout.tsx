import { AppShell } from '@/components/AppShell'
import { requireMember } from '@backend/lib/auth'
import { runLazyNotifications } from '@backend/lib/lazy-notifications'

export default async function AppLayout({ children }: LayoutProps<'/[locale]'>) {
  const user = await requireMember()
  await runLazyNotifications(user.id) // promemoria e scadenza tessera, pigri e idempotenti (non lancia mai)
  return <AppShell user={user}>{children}</AppShell>
}
