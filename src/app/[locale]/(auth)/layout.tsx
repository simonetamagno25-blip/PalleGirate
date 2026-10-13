import { useTranslations } from 'next-intl'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'

export default function AuthLayout({ children }: LayoutProps<'/[locale]'>) {
  const t = useTranslations('common')
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t('appName')}</h1>
      <div className="w-full max-w-sm">{children}</div>
      <LocaleSwitcher />
    </main>
  )
}
