'use client'

import { Link, usePathname } from '@/i18n/routing'
import { cn } from '@/lib/utils'

export type NavItem = { href: '/dashboard' | '/calendar' | '/booking/new' | '/bookings' | '/profile' | '/admin'; label: string }

/** Link di navigazione dell'header (su sfondo verde): la sezione corrente è evidenziata in lime. */
export function NavLinks({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname()
  return (
    <>
      {items.map((l) => {
        const active = pathname === l.href || (l.href !== '/booking/new' && pathname.startsWith(`${l.href}/`))
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
              active ? 'bg-accent text-accent-foreground' : 'text-primary-foreground/85 hover:bg-white/10 hover:text-primary-foreground',
            )}
          >
            {l.label}
          </Link>
        )
      })}
    </>
  )
}
