'use server'

import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { z } from 'zod'
import { redirect } from '@/i18n/routing'
import { requireAdmin } from '@/lib/auth'
import {
  createMember,
  renewMembership,
  resetAccess,
  setAdmin,
  updateMember,
  type MemberInput,
} from '@/lib/members'
import { fromRome } from '@/lib/time'

export type MemberFormState = { error?: string }

const KNOWN_ERRORS = [
  'DUPLICATE_EMAIL',
  'DUPLICATE_MEMBERSHIP_NUMBER',
  'LAST_ADMIN',
  'NOT_FOUND',
  'SELF_RESET',
  'NO_MEMBERSHIP',
]

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const optionalDay = z.preprocess((v) => (v === '' ? undefined : v), day.optional())

const memberSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  birthDate: day,
  email: z.string().trim().pipe(z.email()),
  phone: z.string().trim().min(1),
  membershipNumber: z.string().trim().min(1).optional(),
  issuedAt: optionalDay,
  expiresAt: optionalDay,
})

const noon = (d: string) => fromRome(d, '12:00')

function fields(formData: FormData) {
  return Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === 'string'))
}

async function toMemberError(e: unknown): Promise<MemberFormState> {
  const code = (e as Error).message
  if (KNOWN_ERRORS.includes(code)) return { error: code }
  throw e
}

export async function createMemberAction(_prev: MemberFormState, formData: FormData): Promise<MemberFormState> {
  const admin = await requireAdmin()
  const parsed = memberSchema.safeParse(fields(formData))
  if (!parsed.success) return { error: 'INVALID_INPUT' }
  const { membershipNumber, issuedAt, ...d } = parsed.data
  if (!membershipNumber || !issuedAt) return { error: 'INVALID_INPUT' }
  const input: MemberInput = {
    firstName: d.firstName,
    lastName: d.lastName,
    birthDate: noon(d.birthDate),
    email: d.email,
    phone: d.phone,
    membershipNumber,
    issuedAt: noon(issuedAt),
    expiresAt: d.expiresAt ? noon(d.expiresAt) : undefined,
  }
  try {
    await createMember(admin, input)
  } catch (e) {
    return toMemberError(e)
  }
  revalidatePath('/admin/members')
  redirect({ href: '/admin/members', locale: await getLocale() })
  return {}
}

export async function updateMemberAction(
  userId: string,
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const admin = await requireAdmin()
  const parsed = memberSchema.safeParse(fields(formData))
  if (!parsed.success) return { error: 'INVALID_INPUT' }
  const d = parsed.data
  try {
    await updateMember(admin, userId, {
      firstName: d.firstName,
      lastName: d.lastName,
      birthDate: noon(d.birthDate),
      email: d.email,
      phone: d.phone,
      membershipNumber: d.membershipNumber,
      issuedAt: d.issuedAt ? noon(d.issuedAt) : undefined,
      expiresAt: d.expiresAt ? noon(d.expiresAt) : undefined,
    })
  } catch (e) {
    return toMemberError(e)
  }
  revalidatePath('/admin/members')
  redirect({ href: '/admin/members', locale: await getLocale() })
  return {}
}

/** Azioni dei pulsanti di riga: eseguono e ricaricano l'elenco; un errore noto torna come ?error=. */
async function rowAction(formData: FormData, run: (admin: Awaited<ReturnType<typeof requireAdmin>>, id: string) => Promise<void>) {
  const admin = await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const locale = await getLocale()
  try {
    await run(admin, id)
  } catch (e) {
    const code = (e as Error).message
    if (!KNOWN_ERRORS.includes(code)) throw e
    redirect({ href: { pathname: '/admin/members', query: { error: code } }, locale })
  }
  revalidatePath('/admin/members')
}

export async function renewAction(formData: FormData): Promise<void> {
  await rowAction(formData, async (admin, id) => void (await renewMembership(admin, id)))
}

export async function resetAccessAction(formData: FormData): Promise<void> {
  await rowAction(formData, (admin, id) => resetAccess(admin, id))
}

export async function toggleAdminAction(formData: FormData): Promise<void> {
  const makeAdmin = formData.get('makeAdmin') === 'true'
  await rowAction(formData, (admin, id) => setAdmin(admin, id, makeAdmin))
}
