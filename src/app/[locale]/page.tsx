import { redirect } from '@/i18n/routing'
import { getSessionUser } from '@/lib/auth'

// La home non ha contenuto: porta al calendario (autenticati) o al login.
export default async function Home({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  const user = await getSessionUser()
  redirect({ href: user ? '/calendar' : '/login', locale })
}
