'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createField, setFieldActive, updateField } from '@/lib/admin-config'
import { requireAdmin } from '@/lib/auth'
import { BookingError } from '@/lib/booking-service'

export type FieldFormState = { error?: string; saved?: boolean }

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : '')

/** Importo in euro ("18", "18,50", "18.5") → centesimi; NaN se non valido. */
function cents(v: FormDataEntryValue | null): number {
  const s = str(v).trim().replace(',', '.')
  return /^\d+(\.\d{1,2})?$/.test(s) ? Math.round(Number(s) * 100) : NaN
}

function input(formData: FormData) {
  const slot = str(formData.get('slotMinutes')).trim()
  return {
    name: str(formData.get('name')),
    sport: str(formData.get('sport')),
    slotMinutes: slot === '' ? NaN : Number(slot),
    pricePerSlot: cents(formData.get('price')),
  }
}

/** Crea (id vuoto) o aggiorna un campo. */
export async function saveFieldAction(id: string | null, _prev: FieldFormState, formData: FormData): Promise<FieldFormState> {
  const admin = await requireAdmin()
  try {
    if (id === null) await createField(admin, input(formData))
    else await updateField(admin, z.string().min(1).max(64).parse(id), input(formData))
  } catch (e) {
    if (e instanceof BookingError) return { error: e.violations[0] }
    throw e
  }
  revalidatePath('/', 'layout')
  return { saved: true }
}

export async function setFieldActiveAction(
  id: string,
  active: boolean,
  cancelFuture: boolean,
): Promise<{ ok: true; cancelled: number } | { ok: false; violations: string[] }> {
  const admin = await requireAdmin()
  const parsed = z.object({ id: z.string().min(1).max(64), active: z.boolean(), cancelFuture: z.boolean() }).safeParse({ id, active, cancelFuture })
  if (!parsed.success) return { ok: false, violations: ['INVALID_INPUT'] }
  try {
    const { cancelled } = await setFieldActive(admin, parsed.data.id, parsed.data.active, { cancelFuture: parsed.data.cancelFuture })
    revalidatePath('/', 'layout')
    return { ok: true, cancelled }
  } catch (e) {
    if (e instanceof BookingError) return { ok: false, violations: [...e.violations] }
    throw e
  }
}
