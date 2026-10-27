import { redirect } from '@/i18n/routing'
import { getSessionUser } from '@backend/lib/auth'
import { homeTarget } from '@backend/lib/home-target'

// La home non ha contenuto: porta al calendario (nella lingua del profilo) o al login.
export default async function Home({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  const target = homeTarget(await getSessionUser(), locale)
  redirect({ href: target.href, locale: target.locale })
}
