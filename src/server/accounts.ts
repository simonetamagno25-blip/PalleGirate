import bcrypt from "bcryptjs";
import { normalizeCardNumber, normalizeEmail } from "@/lib/auth/normalize";
import type { Db } from "./db";
import { fail } from "./errors";

export const MIN_PASSWORD_LENGTH = 8;
// bcrypt considera solo i primi 72 byte: oltre, password diverse risulterebbero equivalenti.
export const MAX_PASSWORD_LENGTH = 72;

// Hash fittizio: confrontiamo sempre, anche per email sconosciute o account non attivati, per non rivelare il tempo di risposta.
const DUMMY_HASH = bcrypt.hashSync("x", 10);

/** Una sessione vale solo se l'utente esiste, ha una password e la versione del JWT coincide con quella corrente. */
export function isSessionValid(user: { passwordHash: string | null; sessionVersion: number } | null, sv: number | undefined): boolean {
  return !!user && !!user.passwordHash && sv === user.sessionVersion;
}

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
  if (input.password.length > MAX_PASSWORD_LENGTH) fail("PASSWORD_TOO_LONG", { max: MAX_PASSWORD_LENGTH });
  // Scrittura condizionale: due attivazioni concorrenti non possono entrambe riuscire.
  const { count } = await db.user.updateMany({
    where: { id: membership.userId, passwordHash: null },
    data: { passwordHash: await hashPassword(input.password), sessionVersion: { increment: 1 } },
  });
  if (count === 0) fail("ALREADY_ACTIVE");
  return { userId: membership.userId };
}

export async function verifyCredentials(db: Db, email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: normalizeEmail(email) } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  return user?.passwordHash && password && ok ? user : null;
}
