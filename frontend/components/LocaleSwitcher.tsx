'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { saveLocaleAction } from '@backend/actions/locale'
import { routing, usePathname, useRouter } from '@/i18n/routing'
import { cn } from '@/lib/utils'

export function LocaleSwitcher() {
  const t = useTranslations('common')
  const current = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function change(locale: (typeof routing.locales)[number]) {
    startTransition(async () => {
      await saveLocaleAction(locale)
      router.replace(pathname, { locale })
    })
  }

  return (
    <div role="group" aria-label={t('language')} className="inline-flex rounded-full border border-white/30 p-0.5 text-sm text-primary-foreground">
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          disabled={pending}
          aria-pressed={locale === current}
          onClick={() => change(locale)}
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-bold uppercase transition-colors',
            locale === current ? 'bg-accent text-accent-foreground' : 'hover:bg-white/10',
          )}
        >
          {locale}
        </button>
      ))}
    </div>
  )
}
