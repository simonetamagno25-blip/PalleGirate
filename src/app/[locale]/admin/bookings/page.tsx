import { getFormatter, getTranslations } from 'next-intl/server'
import { CancelBookingButton } from '@/components/CancelBookingButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/i18n/routing'
import { requireAdmin } from '@/lib/auth'
import { listAllBookings } from '@/lib/booking-queries'
import { prisma } from '@/lib/db'
import { displayReason } from '@/lib/reasons'

const text = (v: string | string[] | undefined) => (typeof v === 'string' && v !== '' ? v : undefined)

export default async function AdminBookingsPage({ searchParams }: PageProps<'/[locale]/admin/bookings'>) {
  const admin = await requireAdmin()
  const sp = await searchParams
  const day = /^\d{4}-\d{2}-\d{2}$/.test(text(sp.day) ?? '') ? text(sp.day) : undefined
  const filters = { fieldId: text(sp.field), day, q: text(sp.q) }

  const [bookings, fields, t, tb, tAll, format] = await Promise.all([
    listAllBookings(admin, filters),
    prisma.field.findMany({ orderBy: { name: 'asc' } }),
    getTranslations('admin.bookings'),
    getTranslations('bookings'),
    getTranslations(),
    getFormatter(),
  ])
  const time = (d: Date) => format.dateTime(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const money = (cents: number) => format.number(cents / 100, { style: 'currency', currency: 'EUR' })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <Button render={<Link href="/admin/bookings/new" />}>{t('new')}</Button>
      </div>

      <form className="flex flex-wrap items-end gap-3" role="search">
        <label className="flex flex-col gap-1 text-sm">
          {t('filterField')}
          <select name="field" defaultValue={filters.fieldId ?? ''} className="h-9 rounded-md border bg-background px-3">
            <option value="">{t('allFields')}</option>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('filterDay')}
          <Input type="date" name="day" defaultValue={filters.day ?? ''} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('filterMember')}
          <Input name="q" defaultValue={filters.q ?? ''} />
        </label>
        <Button type="submit" variant="secondary">
          {t('filter')}
        </Button>
        <Button variant="ghost" render={<Link href="/admin/bookings" />}>
          {t('reset')}
        </Button>
      </form>

      {bookings.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('col.when')}</TableHead>
              <TableHead>{t('col.field')}</TableHead>
              <TableHead>{t('col.member')}</TableHead>
              <TableHead>{t('col.status')}</TableHead>
              <TableHead>{t('col.payment')}</TableHead>
              <TableHead>{t('col.price')}</TableHead>
              <TableHead className="text-right">{t('col.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div>{format.dateTime(b.start, { dateStyle: 'medium' })}</div>
                  <div className="text-xs text-muted-foreground">
                    {time(b.start)}–{time(b.end)}
                  </div>
                </TableCell>
                <TableCell>{b.field.name}</TableCell>
                <TableCell>
                  <div>
                    {b.user.lastName} {b.user.firstName}
                  </div>
                  <div className="text-xs text-muted-foreground">{b.user.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={b.status === 'CANCELLED' ? 'outline' : 'secondary'}>{tb(`status.${b.status}`)}</Badge>
                  {b.noShow && <div className="mt-1 text-xs text-muted-foreground">{t('noShow')}</div>}
                  {b.cancelReason && <div className="mt-1 text-xs text-muted-foreground">{tb('reason', { reason: displayReason(b.cancelReason, (k) => tAll(k)) ?? '' })}</div>}
                </TableCell>
                <TableCell>{(b.status === 'CONFIRMED' || b.chargeable) && tb(`payment.${b.paymentStatus}`)}</TableCell>
                <TableCell>{money(b.priceCents)}</TableCell>
                <TableCell>
                  {b.status === 'CONFIRMED' && (
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" render={<Link href={`/bookings/${b.id}/edit`} />}>
                          {tb('edit')}
                        </Button>
                        <CancelBookingButton bookingId={b.id} admin defaultReason={t('cancelReasonDefault')} />
                      </div>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
