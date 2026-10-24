import { getFormatter, getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { FieldForm, ToggleFieldButton } from './field-form'

export default async function AdminFieldsPage() {
  await requireAdmin()
  const now = new Date()
  const [fields, future, t, format] = await Promise.all([
    prisma.field.findMany({ orderBy: { name: 'asc' } }),
    prisma.booking.groupBy({ by: ['fieldId'], where: { status: 'CONFIRMED', start: { gt: now } }, _count: true }),
    getTranslations('admin.fields'),
    getFormatter(),
  ])
  const futureOf = new Map(future.map((r) => [r.fieldId, r._count]))
  // Il prezzo si modifica in euro con la virgola decimale della lingua; il server accetta sia "," sia ".".
  const euros = (cents: number) => format.number(cents / 100, { minimumFractionDigits: 0, maximumFractionDigits: 2, useGrouping: false })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('intro')}</p>
      </div>

      <ul className="flex flex-col gap-3">
        {fields.map((f) => (
          <li key={f.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{f.name}</span>
                {!f.active && <Badge variant="outline">{t('inactive')}</Badge>}
                {(futureOf.get(f.id) ?? 0) > 0 && (
                  <span className="text-xs text-muted-foreground">{t('futureBookings', { count: futureOf.get(f.id) ?? 0 })}</span>
                )}
              </div>
              <ToggleFieldButton id={f.id} active={f.active} futureCount={futureOf.get(f.id) ?? 0} />
            </div>
            <FieldForm
              id={f.id}
              defaults={{ name: f.name, sport: f.sport, slotMinutes: f.slotMinutes, price: euros(f.pricePerSlot) }}
            />
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-2 rounded-lg border border-dashed p-4">
        <h2 className="font-medium">{t('newTitle')}</h2>
        <FieldForm id={null} />
      </section>
    </div>
  )
}
