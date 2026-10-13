import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { addDays, romeDay } from '@/lib/time'

/** Dati che il form di prenotazione riceve dal server: campi attivi, orari, finestra di giorni prenotabili. */
export async function getBookingFormData() {
  const [fields, settings] = await Promise.all([
    prisma.field.findMany({
      where: { active: true },
      select: { id: true, name: true, slotMinutes: true, pricePerSlot: true },
      orderBy: { name: 'asc' },
    }),
    getSettings(),
  ])
  const today = romeDay(new Date())
  return {
    fields,
    settings: {
      openMinutes: settings.openMinutes,
      closeMinutes: settings.closeMinutes,
      stepMinutes: settings.stepMinutes,
      maxSlots: settings.maxSlotsPerBooking,
    },
    today,
    maxDay: addDays(today, settings.maxAdvanceDays),
  }
}
