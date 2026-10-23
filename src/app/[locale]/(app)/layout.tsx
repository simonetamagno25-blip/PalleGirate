import { AppShell } from '@/components/AppShell'
import { requireMember } from '@/lib/auth'

export default async function AppLayout({ children }: LayoutProps<'/[locale]'>) {
  const user = await requireMember()
  return <AppShell user={user}>{children}</AppShell>
}
