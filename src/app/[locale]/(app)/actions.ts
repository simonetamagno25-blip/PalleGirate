'use server'

// Azioni di prenotazione. Ogni azione inizia con la guardia di autorizzazione, valida l'input con zod
// e traduce gli errori di dominio in codici (le chiavi `errors.booking.*` dei messaggi).
import { z } from 'zod'
import { requireAdmin, requireMember } from '@/lib/auth'
import { BookingError, cancelBooking, createBooking, updateBooking } from '@/lib/booking-service'
import { prisma } from '@/lib/db'
import type { RuleParams } from '@/lib/booking-rules'
import { ruleParams } from '@/lib/booking-rules'
import { getSettings } from '@/lib/settings'
import { fromRome } from '@/lib/time'

/** `params`: i valori delle regole citati nei messaggi (orari, giorni, ore…), letti dalle impostazioni correnti. */
export type ActionResult = { ok: true } | { ok: false; violations: string[]; params?: RuleParams }
export type CreateResult = { ok: true; id: string } | { ok: false; violations: string[]; params?: RuleParams }

const INVALID: { ok: false; violations: string[] } = { ok: false, violations: ['INVALID_INPUT'] }

const slotForm = z.object({
  fieldId: z.string().min(1),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  slots: z.number().int(),
})
const adminForm = slotForm.extend({ memberId: z.string().min(1) })

export type SlotForm = z.input<typeof slotForm>
export type AdminSlotForm = z.input<typeof adminForm>

/** Valida il form e ne ricava l'istante di inizio (null se giorno/ora non esistono). */
function parseSlot<T extends z.ZodType<z.output<typeof slotForm>>>(schema: T, raw: unknown) {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return null
  try {
    return { ...parsed.data, start: fromRome(parsed.data.day, parsed.data.time) }
  } catch {
    return null
  }
}

async function guarded<T extends ActionResult | CreateResult>(run: () => Promise<T>): Promise<T | typeof INVALID> {
  try {
    return await run()
  } catch (e) {
    if (e instanceof BookingError) {
      return { ok: false, violations: [...e.violations], params: ruleParams(await getSettings()) } as T
    }
    throw e
  }
}

/**
 * Le azioni del socio agiscono sempre "come socio", anche se l'utente è anche admin: le regole del socio
 * valgono per ciò che fa come socio, i poteri admin passano solo dalle azioni `admin*` (spec §6).
 */
async function asMember() {
  const user = await requireMember()
  return { id: user.id, isAdmin: false }
}

export async function createBookingAction(form: SlotForm): Promise<CreateResult> {
  const actor = await asMember()
  const f = parseSlot(slotForm, form) // lo schema scarta ogni memberId: si prenota sempre per sé
  if (!f) return INVALID
  return guarded(async () => {
    const b = await createBooking(actor, { memberId: actor.id, fieldId: f.fieldId, start: f.start, slots: f.slots })
    return { ok: true, id: b.id }
  })
}

export async function updateBookingAction(id: string, form: SlotForm): Promise<ActionResult> {
  const actor = await asMember()
  const f = parseSlot(slotForm, form)
  if (!f) return INVALID
  return guarded(async () => {
    await updateBooking(actor, id, { fieldId: f.fieldId, start: f.start, slots: f.slots })
    return { ok: true }
  })
}

export async function cancelBookingAction(id: string, reason?: string): Promise<ActionResult> {
  const actor = await asMember()
  return guarded(async () => {
    await cancelBooking(actor, id, reason)
    return { ok: true }
  })
}

export async function adminUpdateBookingAction(id: string, form: SlotForm): Promise<ActionResult> {
  const admin = await requireAdmin()
  const f = parseSlot(slotForm, form)
  if (!f) return INVALID
  return guarded(async () => {
    await updateBooking(admin, id, { fieldId: f.fieldId, start: f.start, slots: f.slots })
    return { ok: true }
  })
}

export async function adminCreateBookingAction(form: AdminSlotForm): Promise<CreateResult> {
  const admin = await requireAdmin()
  const f = parseSlot(adminForm, form)
  if (!f || !('memberId' in f)) return INVALID
  return guarded(async () => {
    const b = await createBooking(admin, { memberId: f.memberId, fieldId: f.fieldId, start: f.start, slots: f.slots })
    return { ok: true, id: b.id }
  })
}

export async function adminCancelBookingAction(id: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  return guarded(async () => {
    await cancelBooking(admin, id, reason)
    return { ok: true }
  })
}

/** Prezzo in centesimi per l'anteprima del riepilogo (0 se campo o slot non validi). */
export async function previewPriceAction(fieldId: string, slots: number): Promise<number> {
  await requireMember()
  if (!Number.isInteger(slots) || slots < 1) return 0
  const field = await prisma.field.findUnique({ where: { id: fieldId } })
  return field ? slots * field.pricePerSlot : 0
}
