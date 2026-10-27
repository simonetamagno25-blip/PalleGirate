'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

/** Errore imprevisto in una pagina: messaggio tradotto e possibilità di riprovare. */
export default function LocaleError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations('errors')
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{t('generic')}</h1>
      <Button onClick={() => retry()}>{t('retry')}</Button>
    </main>
  )
}
