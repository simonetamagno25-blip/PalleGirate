'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionResult } from '@backend/actions/bookings'
import { requireAdmin } from '@backend/lib/auth'
import { BookingError } from '@backend/lib/booking-service'
import { registerPayment, setNoShow } from '@backend/lib/payments'

const INVALID: ActionResult = { ok: false, violations: ['INVALID_INPUT'] }

const idSchema = z.string().min(1).max(64)
const outcomeSchema = z.enum(['PAID', 'UNPAID', 'EXEMPT'])

async function guarded(run: () => Promise<void>): Promise<ActionResult> {
  try {
    await run()
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (e) {
    if (e instanceof BookingError) return { ok: false, violations: [...e.violations] }
    throw e
  }
}

export async function registerPaymentAction(id: string, outcome: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  const parsed = z.object({ id: idSchema, outcome: outcomeSchema }).safeParse({ id, outcome })
  if (!parsed.success) return INVALID
  return guarded(async () => {
    await registerPayment(admin, parsed.data.id, parsed.data.outcome)
  })
}

export async function setNoShowAction(id: string, noShow: boolean): Promise<ActionResult> {
  const admin = await requireAdmin()
  const parsed = z.object({ id: idSchema, noShow: z.boolean() }).safeParse({ id, noShow })
  if (!parsed.success) return INVALID
  return guarded(() => setNoShow(admin, parsed.data.id, parsed.data.noShow))
}
