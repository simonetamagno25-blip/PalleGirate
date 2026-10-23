'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { saveLocaleAction } from '@/app/[locale]/actions-locale'
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
    <div role="group" aria-label={t('language')} className="inline-flex rounded-md border text-sm">
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          disabled={pending}
          aria-pressed={locale === current}
          onClick={() => change(locale)}
          className={cn(
            'px-2.5 py-1 uppercase first:rounded-l-md last:rounded-r-md',
            locale === current ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
          )}
        >
          {locale}
        </button>
      ))}
    </div>
  )
}
