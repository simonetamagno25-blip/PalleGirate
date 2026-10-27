import { notFound } from 'next/navigation'
import { getFormatter, getTranslations } from 'next-intl/server'
import { PaymentButtons } from '@/components/PaymentButtons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'
import { requireAdmin } from '@backend/lib/auth'
import { prisma } from '@backend/lib/db'
import { getMemberLedger } from '@backend/lib/payments'

export default async function MemberDetailPage({ params }: PageProps<'/[locale]/admin/members/[id]'>) {
  const admin = await requireAdmin()
  const { id } = await params
  const member = await prisma.user.findUnique({ where: { id }, include: { membership: true } })
  if (!member) notFound()
  const [ledger, t, tb, format] = await Promise.all([
    getMemberLedger(admin, id),
    getTranslations('admin.memberDetail'),
    getTranslations('bookings'),
    getFormatter(),
  ])
  const field = new Map((await prisma.field.findMany()).map((f) => [f.id, f.name]))
  const time = (d: Date) => format.dateTime(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const money = (cents: number) => format.number(cents / 100, { style: 'currency', currency: 'EUR' })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {member.lastName} {member.firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {member.email}
            {member.membership && ` · ${t('card', { number: member.membership.number })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ledger.blocked && <Badge variant="destructive">{t('blocked')}</Badge>}
          <Button variant="outline" render={<Link href={`/admin/members/${member.id}/edit`} />}>
            {t('edit')}
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(
          [
            ['strikes', String(ledger.strikes)],
            ['unpaid', String(ledger.unpaidCount)],
            ['debt', money(ledger.debtCents)],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="rounded-2xl border bg-card p-4 shadow-sm">
            <dt className="text-sm text-muted-foreground">{t(k)}</dt>
            <dd className="text-2xl font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t('history')}</h2>
        {ledger.history.length === 0 && <p className="text-muted-foreground">{t('emptyHistory')}</p>}
        <ul className="flex flex-col gap-2">
          {ledger.history.map((b) => (
            <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-card p-3 shadow-sm text-sm">
              <div>
                <p className="font-medium">{field.get(b.fieldId)}</p>
                <p>
                  {format.dateTime(b.start, { dateStyle: 'medium' })}, {time(b.start)}–{time(b.end)} · {money(b.priceCents)}
                </p>
                {b.noShow && <p className="text-muted-foreground">{t('noShow')}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={b.status === 'CANCELLED' ? 'outline' : 'secondary'}>{tb(`status.${b.status}`)}</Badge>
                {(b.status === 'CONFIRMED' || b.chargeable) && <Badge variant="outline">{tb(`payment.${b.paymentStatus}`)}</Badge>}
                {b.paymentStatus === 'UNPAID' && <PaymentButtons bookingId={b.id} outcomes={['PAID', 'EXEMPT']} />}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
