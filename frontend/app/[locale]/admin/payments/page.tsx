import { getFormatter, getTranslations } from 'next-intl/server'
import { PaymentButtons } from '@/components/PaymentButtons'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/i18n/routing'
import { requireAdmin } from '@backend/lib/auth'
import { listPendingPayments } from '@backend/lib/payments'

export default async function AdminPaymentsPage() {
  const admin = await requireAdmin()
  const [pending, t, format] = await Promise.all([
    listPendingPayments(admin),
    getTranslations('admin.payments'),
    getFormatter(),
  ])
  const time = (d: Date) => format.dateTime(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const money = (cents: number) => format.number(cents / 100, { style: 'currency', currency: 'EUR' })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <p className="text-sm text-muted-foreground">{t('intro')}</p>

      {pending.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('col.when')}</TableHead>
                <TableHead>{t('col.member')}</TableHead>
                <TableHead>{t('col.field')}</TableHead>
                <TableHead>{t('col.price')}</TableHead>
                <TableHead className="text-right">{t('col.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div>{format.dateTime(b.start, { dateStyle: 'medium' })}</div>
                    <div className="text-xs text-muted-foreground">
                      {time(b.start)}–{time(b.end)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/members/${b.user.id}`} className="font-medium hover:underline">
                      {b.user.lastName} {b.user.firstName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>{b.field.name}</div>
                    {b.status === 'CANCELLED' && <Badge variant="destructive">{t('lateCancel')}</Badge>}
                  </TableCell>
                  <TableCell>{money(b.priceCents)}</TableCell>
                  <TableCell>
                    <PaymentButtons bookingId={b.id} outcomes={['PAID', 'UNPAID', 'EXEMPT']} noShow={b.noShow} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
