import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'

export default async function LocaleNotFound() {
  const t = await getTranslations('errors')
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{t('notFound')}</h1>
      <p className="text-muted-foreground">{t('notFoundHint')}</p>
      <Button render={<Link href="/" />}>{t('backHome')}</Button>
    </main>
  )
}
