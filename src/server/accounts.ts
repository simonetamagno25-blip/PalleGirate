import bcrypt from "bcryptjs";
import { normalizeCardNumber, normalizeEmail } from "@/lib/auth/normalize";
import type { Db } from "./db";
import { fail } from "./errors";

export const MIN_PASSWORD_LENGTH = 8;

export const hashPassword = (p: string) => bcrypt.hash(p, 10);

export async function activateAccount(db: Db, input: { cardNumber: string; email: string; password: string }) {
  const membership = await db.membership.findUnique({
    where: { number: normalizeCardNumber(input.cardNumber) },
    include: { user: true },
  });
  // Stesso errore per tessera o email sbagliate: non riveliamo quale dei due esiste.
  if (!membership || membership.user.email !== normalizeEmail(input.email)) return fail("ACTIVATION_MISMATCH");
  if (membership.user.passwordHash) fail("ALREADY_ACTIVE");
  if (input.password.length < MIN_PASSWORD_LENGTH) fail("PASSWORD_TOO_SHORT", { min: MIN_PASSWORD_LENGTH });
  await db.user.update({ where: { id: membership.userId }, data: { passwordHash: await hashPassword(input.password) } });
  return { userId: membership.userId };
}

export async function verifyCredentials(db: Db, email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user?.passwordHash || !password) return null;
  return (await bcrypt.compare(password, user.passwordHash)) ? user : null;
}
