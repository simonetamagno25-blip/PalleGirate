import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { BookingForm } from '@/components/BookingForm'
import { requireMember } from '@/lib/auth'
import { canChangeOrCancel } from '@/lib/booking-rules'
import { getBookingFormData } from '@/lib/booking-form-data'
import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { hhmm, romeDay, romeMinutesOfDay } from '@/lib/time'

export default async function EditBookingPage({ params }: PageProps<'/[locale]/bookings/[id]/edit'>) {
  const user = await requireMember()
  const { id } = await params
  const booking = await prisma.booking.findUnique({ where: { id } })
  // Un socio non vede nemmeno l'esistenza delle prenotazioni altrui.
  if (!booking || booking.status !== 'CONFIRMED' || (!user.isAdmin && booking.userId !== user.id)) notFound()

  const [data, settings, t, tb] = await Promise.all([
    getBookingFormData(),
    getSettings(),
    getTranslations('booking'),
    getTranslations('bookings'),
  ])
  const editable = user.isAdmin || canChangeOrCancel(booking.start, new Date(), settings)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('editTitle')}</h1>
      {editable ? (
        <BookingForm
          bookingId={booking.id}
          fields={data.fields}
          settings={data.settings}
          minDay={data.today}
          maxDay={user.isAdmin ? undefined : data.maxDay}
          initial={{
            fieldId: booking.fieldId,
            day: romeDay(booking.start),
            time: hhmm(romeMinutesOfDay(booking.start)),
            slots: booking.slots,
          }}
          doneHref={user.isAdmin && booking.userId !== user.id ? '/admin/bookings' : '/bookings'}
        />
      ) : (
        <p role="alert" className="text-destructive">
          {tb('windowClosed')}
        </p>
      )}
    </div>
  )
}
