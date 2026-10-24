import { useTranslations } from 'next-intl'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'
import { Logo } from '@/components/Logo'

export default function AuthLayout({ children }: LayoutProps<'/[locale]'>) {
  const t = useTranslations('common')
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden bg-primary px-4 py-10 text-primary-foreground">
      {/* Sfondo: cerchi sfumati lime e salvia, come palloni in movimento. */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 size-80 rounded-full bg-accent/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-chart-2/30 blur-3xl" />
      <div className="relative flex flex-col items-center gap-4">
        <div className="grid size-32 place-items-center rounded-full bg-background shadow-xl ring-4 ring-accent">
          <Logo height={88} priority />
        </div>
        <h1 className="text-center text-5xl tracking-wide">{t('appName')}</h1>
      </div>
      <div className="relative w-full max-w-sm text-foreground">{children}</div>
      <div className="relative">
        <LocaleSwitcher />
      </div>
    </main>
  )
}
