import { redirect } from '@/i18n/routing'

export default async function AdminHome({ params }: PageProps<'/[locale]/admin'>) {
  const { locale } = await params
  redirect({ href: '/admin/members', locale })
}
