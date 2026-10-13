// Gestione soci e attivazione degli account (spec §5, §10).
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const MIN_PASSWORD_LENGTH = 8
const BCRYPT_ROUNDS = 10

const activationSchema = z.object({
  membershipNumber: z.string(),
  email: z.string(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
})

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
