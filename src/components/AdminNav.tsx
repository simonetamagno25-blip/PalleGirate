'use client'

import { Link, usePathname } from '@/i18n/routing'
import { cn } from '@/lib/utils'

export type AdminNavItem = {
  href: '/admin/dashboard' | '/admin/members' | '/admin/bookings' | '/admin/payments' | '/admin/fields' | '/admin/settings'
  label: string
}

/** Sottomenu dell'area admin (su sfondo chiaro): la sezione corrente è piena verde. */
export function AdminNav({ items }: { items: readonly AdminNavItem[] }) {
  const pathname = usePathname()
  return (
    <nav className="mb-8 flex gap-1.5 overflow-x-auto pb-1 text-sm">
      {items.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`)
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap rounded-full border px-4 py-1.5 font-semibold transition-colors',
              active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-secondary',
            )}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
