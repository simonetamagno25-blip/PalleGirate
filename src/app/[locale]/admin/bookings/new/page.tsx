import { getTranslations } from 'next-intl/server'
import { BookingForm } from '@/components/BookingForm'
import { requireAdmin } from '@/lib/auth'
import { getBookingFormData } from '@/lib/booking-form-data'
import { listMembers } from '@/lib/members'

export default async function AdminNewBookingPage() {
  const admin = await requireAdmin()
  const [data, members, t] = await Promise.all([getBookingFormData(), listMembers(admin), getTranslations('booking')])
  if (data.fields.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('adminNewTitle')}</h1>
      <BookingForm
        fields={data.fields}
        settings={data.settings}
        minDay={data.today}
        members={members.map((m) => ({ id: m.id, label: `${m.lastName} ${m.firstName}` }))}
        initial={{ fieldId: data.fields[0].id, day: data.today, time: '18:00', slots: 1 }}
        doneHref="/admin/bookings"
      />
    </div>
  )
}
