import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
  locales: ['it', 'en'],
  defaultLocale: 'it',
})

export type Locale = (typeof routing.locales)[number]

// Link, redirect, usePathname e useRouter che conoscono il prefisso di lingua.
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing)
