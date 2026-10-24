import { LogOut } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { logoutAction } from '@/app/[locale]/actions-session'
import { Button } from '@/components/ui/button'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'
import { Logo } from '@/components/Logo'
import { NavLinks, type NavItem } from '@/components/NavLinks'
import { NotificationBell } from '@/components/NotificationBell'
import { Link } from '@/i18n/routing'
import type { SessionUser } from '@/lib/auth'

/** Struttura comune delle pagine autenticate: header con navigazione, lingua e uscita. */
export async function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const t = await getTranslations('nav')
  const links: NavItem[] = [
    { href: '/dashboard', label: t('dashboard') },
    { href: '/calendar', label: t('calendar') },
    { href: '/booking/new', label: t('newBooking') },
    { href: '/bookings', label: t('myBookings') },
    { href: '/profile', label: t('profile') },
    ...(user.isAdmin ? [{ href: '/admin' as const, label: t('admin') }] : []),
  ]

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3 sm:gap-x-5">
          <Link
            href="/dashboard"
            className="mr-auto flex items-center gap-2.5 rounded-xl bg-background py-1 pr-3 pl-2 text-foreground sm:pr-4 md:mr-0"
          >
            <Logo height={34} priority />
            <span className="font-heading text-base font-extrabold tracking-wide uppercase sm:text-xl">Palle Girate</span>
          </Link>
          {/* Su telefono la navigazione va su una riga a parte, scorrevole in orizzontale. */}
          <nav className="order-last flex basis-full gap-1 overflow-x-auto pb-0.5 md:order-none md:basis-auto md:flex-1">
            <NavLinks items={links} />
          </nav>
          <NotificationBell userId={user.id} />
          <LocaleSwitcher />
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              aria-label={t('logout')}
              className="border-white/30 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground dark:bg-transparent dark:hover:bg-white/10"
            >
              <LogOut className="size-4 sm:hidden" aria-hidden />
              <span className="hidden sm:inline">{t('logout')}</span>
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}
