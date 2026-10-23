'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { updateSettings } from '@/lib/admin-config'
import { BookingError } from '@/lib/booking-service'

export type SettingsFormState = { error?: string; saved?: boolean }

const num = (v: FormDataEntryValue | null) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN)

/** "HH:MM" → minuti dalla mezzanotte (NaN se il formato non è valido). */
function minutes(v: FormDataEntryValue | null): number {
  const m = typeof v === 'string' ? /^(\d{2}):(\d{2})$/.exec(v) : null
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN
}

export async function updateSettingsAction(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const admin = await requireAdmin()
  try {
    await updateSettings(admin, {
      openMinutes: minutes(formData.get('open')),
      closeMinutes: minutes(formData.get('close')),
      stepMinutes: num(formData.get('stepMinutes')),
      maxAdvanceDays: num(formData.get('maxAdvanceDays')),
      maxActiveBookings: num(formData.get('maxActiveBookings')),
      changeWindowHours: num(formData.get('changeWindowHours')),
      maxSlotsPerBooking: num(formData.get('maxSlotsPerBooking')),
      membershipWarnDays: num(formData.get('membershipWarnDays')),
      reminderHours: num(formData.get('reminderHours')),
    })
  } catch (e) {
    if (e instanceof BookingError) return { error: e.violations[0] }
    throw e
  }
  revalidatePath('/', 'layout')
  return { saved: true }
}
