// Gestione soci e attivazione degli account (spec §5, §10).
import { Prisma, type Membership, type User } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { DateTime } from 'luxon'
import { z } from 'zod'
import type { Actor } from '@/lib/booking-service'
import { prisma } from '@/lib/db'
import { ROME } from '@/lib/time'

const MIN_PASSWORD_LENGTH = 8
const BCRYPT_ROUNDS = 10

const activationSchema = z.object({
  membershipNumber: z.string(),
  email: z.string(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
})

const SUPPORTED_LOCALES = ['it', 'en']

/** Salva la lingua preferita sul profilo dell'utente. */
export async function setUserLocale(userId: string, locale: string): Promise<void> {
  if (!SUPPORTED_LOCALES.includes(locale)) throw new Error('INVALID_LOCALE')
  await prisma.user.update({ where: { id: userId }, data: { locale } })
}

export type SessionIdentity = { id: string; isAdmin: boolean; name: string; email: string }

/** Login con email + password. Restituisce null per qualunque causa di rifiuto (anche account non attivato). */
export async function verifyCredentials(email: string, password: string): Promise<SessionIdentity | null> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (!user?.passwordHash) return null
  if (!(await bcrypt.compare(password, user.passwordHash))) return null
  return { id: user.id, isAdmin: user.isAdmin, name: `${user.firstName} ${user.lastName}`, email: user.email }
}

/**
 * Il socio attiva l'accesso con numero tessera + email (che devono coincidere con quelli registrati
 * dall'admin) e sceglie la password. Ogni causa di rifiuto (tessera inesistente, email diversa,
 * account già attivo) dà lo stesso errore, per non rivelare quali soci esistono.
 */
export async function activateAccount(input: {
  membershipNumber: string
  email: string
  password: string
}): Promise<void> {
  const parsed = activationSchema.safeParse(input)
  if (!parsed.success) throw new Error('WEAK_PASSWORD')
  const { membershipNumber, email, password } = parsed.data

  const membership = await prisma.membership.findUnique({
    where: { number: membershipNumber.trim() },
    include: { user: true },
  })
  const user = membership?.user
  if (!user || user.passwordHash !== null || user.email.toLowerCase() !== email.trim().toLowerCase()) {
    throw new Error('ACTIVATION_FAILED')
  }

  // updateMany con passwordHash nullo: due attivazioni concorrenti non possono vincere entrambe.
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, passwordHash: null },
    data: { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS), activatedAt: new Date() },
  })
  if (count === 0) throw new Error('ACTIVATION_FAILED')
}

// ---------------------------------------------------------------------------
// Gestione soci e tessere (solo admin)
// ---------------------------------------------------------------------------

export type MemberInput = {
  firstName: string
  lastName: string
  birthDate: Date
  email: string
  phone: string
  membershipNumber: string
  issuedAt: Date
  expiresAt?: Date
}

function assertAdmin(actor: Actor): void {
  if (!actor.isAdmin) throw new Error('FORBIDDEN')
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const plusOneYear = (d: Date) => DateTime.fromJSDate(d, { zone: ROME }).plus({ years: 1 }).toJSDate()

/** Numero tessera ed email sono univoci: errori espliciti invece di un'eccezione del database. */
async function assertUnique(
  tx: Prisma.TransactionClient,
  d: { email?: string; membershipNumber?: string },
  exceptUserId?: string,
): Promise<void> {
  if (d.email !== undefined) {
    const other = await tx.user.findUnique({ where: { email: d.email } })
    if (other && other.id !== exceptUserId) throw new Error('DUPLICATE_EMAIL')
  }
  if (d.membershipNumber !== undefined) {
    const other = await tx.membership.findUnique({ where: { number: d.membershipNumber } })
    if (other && other.userId !== exceptUserId) throw new Error('DUPLICATE_MEMBERSHIP_NUMBER')
  }
}

export async function createMember(admin: Actor, d: MemberInput): Promise<User> {
  assertAdmin(admin)
  const email = normalizeEmail(d.email)
  const number = d.membershipNumber.trim()
  return prisma.$transaction(async (tx) => {
    await assertUnique(tx, { email, membershipNumber: number })
    return tx.user.create({
      data: {
        firstName: d.firstName.trim(),
        lastName: d.lastName.trim(),
        birthDate: d.birthDate,
        email,
        phone: d.phone.trim(),
        membership: { create: { number, issuedAt: d.issuedAt, expiresAt: d.expiresAt ?? plusOneYear(d.issuedAt) } },
      },
    })
  })
}

export async function updateMember(admin: Actor, userId: string, d: Partial<MemberInput>): Promise<User> {
  assertAdmin(admin)
  const email = d.email === undefined ? undefined : normalizeEmail(d.email)
  const number = d.membershipNumber?.trim()
  return prisma.$transaction(async (tx) => {
    await assertUnique(tx, { email, membershipNumber: number }, userId)
    const touchesMembership = number !== undefined || d.issuedAt !== undefined || d.expiresAt !== undefined
    if (touchesMembership && !(await tx.membership.findUnique({ where: { userId } }))) throw new Error('NOT_FOUND')
    return tx.user.update({
      where: { id: userId },
      data: {
        firstName: d.firstName?.trim(),
        lastName: d.lastName?.trim(),
        birthDate: d.birthDate,
        email,
        phone: d.phone?.trim(),
        ...(touchesMembership
          ? { membership: { update: { number, issuedAt: d.issuedAt, expiresAt: d.expiresAt } } }
          : {}),
      },
    })
  })
}

/**
 * Rinnovo: stesso numero tessera, nuova emissione = data del rinnovo, nuova scadenza proposta =
 * max(oggi, scadenza attuale) + 1 anno (un rinnovo anticipato non fa perdere giorni). L'admin può correggerla.
 */
export async function renewMembership(
  admin: Actor,
  userId: string,
  d?: { expiresAt?: Date },
  now: Date = new Date(),
): Promise<Membership> {
  assertAdmin(admin)
  return prisma.$transaction(async (tx) => {
    const current = await tx.membership.findUnique({ where: { userId } })
    if (!current) throw new Error('NOT_FOUND')
    const base = current.expiresAt.getTime() > now.getTime() ? current.expiresAt : now
    const expiresAt = d?.expiresAt ?? plusOneYear(base)
    const updated = await tx.membership.update({ where: { id: current.id }, data: { issuedAt: now, expiresAt } })
    await tx.membershipRenewal.create({ data: { membershipId: current.id, issuedAt: now, expiresAt } })
    return updated
  })
}

/** "Reimposta accesso": l'account torna da attivare (numero tessera + email + nuova password). */
export async function resetAccess(admin: Actor, userId: string): Promise<void> {
  assertAdmin(admin)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: null, activatedAt: null } })
}

export async function setAdmin(admin: Actor, userId: string, isAdmin: boolean): Promise<void> {
  assertAdmin(admin)
  await prisma.$transaction(async (tx) => {
    if (!isAdmin) {
      const target = await tx.user.findUnique({ where: { id: userId } })
      const admins = await tx.user.count({ where: { isAdmin: true } })
      if (target?.isAdmin && admins <= 1) throw new Error('LAST_ADMIN')
    }
    await tx.user.update({ where: { id: userId }, data: { isAdmin } })
  })
}

export type MemberRow = Prisma.UserGetPayload<{ include: { membership: true } }>

export async function listMembers(admin: Actor, search?: string): Promise<MemberRow[]> {
  assertAdmin(admin)
  const q = search?.trim()
  return prisma.user.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
            { membership: { is: { number: { contains: q } } } },
          ],
        }
      : {},
    include: { membership: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })
}
