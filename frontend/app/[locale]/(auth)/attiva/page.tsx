import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivateForm } from './activate-form'

export default function ActivatePage() {
  const t = useTranslations('auth')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('activateTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ActivateForm />
        <Link href="/login" className="text-sm text-muted-foreground underline underline-offset-4">
          {t('alreadyActive')}
        </Link>
      </CardContent>
    </Card>
  )
}
