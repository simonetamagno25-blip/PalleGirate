import { getTranslations } from 'next-intl/server'
import { BookingForm } from '@/components/BookingForm'
import { requireMember } from '@/lib/auth'
import { getBookingFormData } from '@/lib/booking-form-data'

const text = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined)

export default async function NewBookingPage({ searchParams }: PageProps<'/[locale]/booking/new'>) {
  const user = await requireMember()
  const sp = await searchParams
  const [data, t] = await Promise.all([getBookingFormData(), getTranslations('booking')])
  if (data.fields.length === 0) return null

  // Precompilato dal click sul calendario; valori non validi ricadono sui default.
  const fieldId = data.fields.find((f) => f.id === text(sp.fieldId))?.id ?? data.fields[0].id
  const day = /^\d{4}-\d{2}-\d{2}$/.test(text(sp.day) ?? '') ? text(sp.day)! : data.today
  const time = /^\d{2}:\d{2}$/.test(text(sp.time) ?? '') ? text(sp.time)! : '18:00'

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('newTitle')}</h1>
      <BookingForm
        fields={data.fields}
        settings={data.settings}
        minDay={data.today}
        maxDay={user.isAdmin ? undefined : data.maxDay}
        initial={{ fieldId, day, time, slots: 1 }}
        doneHref="/bookings"
      />
    </div>
  )
}
