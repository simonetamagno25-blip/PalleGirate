import { notFound } from 'next/navigation'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireMember } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { daysBetween, romeDay } from '@/lib/time'

export default async function ProfilePage() {
  const session = await requireMember()
  const user = await prisma.user.findUnique({ where: { id: session.id }, include: { membership: true } })
  if (!user) notFound()
  const [t, format] = await Promise.all([getTranslations('profile'), getFormatter()])
  const date = (d: Date) => format.dateTime(d, { dateStyle: 'long' })
  const membership = user.membership
  const daysLeft = membership ? daysBetween(romeDay(new Date()), romeDay(membership.expiresAt)) : null

  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-4 border-b py-2 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('personal')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              {row(t('name'), `${user.firstName} ${user.lastName}`)}
              {row(t('email'), user.email)}
              {user.phone && row(t('phone'), user.phone)}
              {user.birthDate && row(t('birthDate'), date(user.birthDate))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('membership')}</CardTitle>
          </CardHeader>
          <CardContent>
            {membership && daysLeft !== null ? (
              <>
                <dl>
                  {row(t('number'), membership.number)}
                  {row(t('issued'), date(membership.issuedAt))}
                  {row(t('expires'), date(membership.expiresAt))}
                </dl>
                <div className="mt-3">
                  <Badge variant={daysLeft < 0 ? 'destructive' : 'secondary'}>
                    {daysLeft < 0 ? t('expired') : t('daysLeft', { days: daysLeft })}
                  </Badge>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">{t('noMembership')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
