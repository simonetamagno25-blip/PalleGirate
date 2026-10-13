import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { logoutAction } from '@/app/[locale]/actions-session'
import { Button } from '@/components/ui/button'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'
import { Link } from '@/i18n/routing'
import type { SessionUser } from '@/lib/auth'

/** Struttura comune delle pagine autenticate: header con navigazione, lingua e uscita. */
export async function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const t = await getTranslations('nav')
  const links = [
    { href: '/calendar', label: t('calendar') },
    { href: '/booking/new', label: t('newBooking') },
    { href: '/bookings', label: t('myBookings') },
    { href: '/profile', label: t('profile') },
    ...(user.isAdmin ? [{ href: '/admin', label: t('admin') }] : []),
  ] as const

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold tracking-tight">Palle Girate</span>
          <nav className="flex flex-1 flex-wrap gap-1 text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-md px-2.5 py-1.5 hover:bg-muted">
                {l.label}
              </Link>
            ))}
          </nav>
          <LocaleSwitcher />
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              {t('logout')}
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
