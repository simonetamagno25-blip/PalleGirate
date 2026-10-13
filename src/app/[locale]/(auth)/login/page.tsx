import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from './login-form'

export default function LoginPage() {
  const t = useTranslations('auth')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('loginTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <LoginForm />
        <Link href="/attiva" className="text-sm text-muted-foreground underline underline-offset-4">
          {t('firstTime')}
        </Link>
      </CardContent>
    </Card>
  )
}
