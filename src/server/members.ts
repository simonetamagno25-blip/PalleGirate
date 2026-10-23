import { Prisma } from "@prisma/client";
import { z } from "zod";
import { normalizeCardNumber, normalizeEmail } from "@/lib/auth/normalize";
import { proposeRenewal } from "@/lib/membership";
import type { Db } from "./db";
import { fail } from "./errors";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optional = (s: z.ZodString) => s.optional().or(z.literal("").transform(() => undefined));

export const memberInputSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    birthDate: optional(day),
    email: z.string().trim().email().max(200),
    phone: optional(z.string().trim().max(40)),
    cardNumber: z.string().trim().min(1).max(40),
    issueDate: day,
    expiryDate: day,
  })
  .refine((v) => v.expiryDate >= v.issueDate, { path: ["expiryDate"] });

export type MemberInput = z.input<typeof memberInputSchema>;

function parse(input: MemberInput) {
  const r = memberInputSchema.safeParse(input);
  if (!r.success) return fail("INVALID_INPUT");
  return { ...r.data, email: normalizeEmail(r.data.email), cardNumber: normalizeCardNumber(r.data.cardNumber) };
}

/** Converte le violazioni di unicità di Prisma in codici leggibili. */
function mapUnique(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    const target = String((e.meta?.target as string[] | string | undefined) ?? "");
    fail(target.includes("email") ? "EMAIL_TAKEN" : "CARD_TAKEN");
  }
  throw e;
}

export async function createMember(db: Db, input: MemberInput) {
  const v = parse(input);
  try {
    return await db.user.create({
      data: {
        firstName: v.firstName, lastName: v.lastName, birthDate: v.birthDate, email: v.email, phone: v.phone,
        membership: {
          create: {
            number: v.cardNumber, issueDate: v.issueDate, expiryDate: v.expiryDate,
            renewals: { create: { issueDate: v.issueDate, expiryDate: v.expiryDate } },
          },
        },
      },
    });
  } catch (e) {
    return mapUnique(e);
  }
}

export async function updateMember(db: Db, userId: string, input: MemberInput) {
  const v = parse(input);
  try {
    return await db.user.update({
      where: { id: userId },
      data: {
        firstName: v.firstName, lastName: v.lastName, birthDate: v.birthDate ?? null, email: v.email, phone: v.phone ?? null,
        membership: {
          upsert: {
            create: { number: v.cardNumber, issueDate: v.issueDate, expiryDate: v.expiryDate },
            update: { number: v.cardNumber, issueDate: v.issueDate, expiryDate: v.expiryDate },
          },
        },
      },
    });
  } catch (e) {
    return mapUnique(e);
  }
}

export async function renewMembership(db: Db, userId: string, today: string, expiryOverride?: string) {
  const current = await db.membership.findUnique({ where: { userId } });
  if (!current) return fail("NOT_FOUND");
  const proposal = proposeRenewal(today, current.expiryDate);
  const expiryDate = expiryOverride && day.safeParse(expiryOverride).success ? expiryOverride : proposal.expiryDate;
  return db.membership.update({
    where: { id: current.id },
    data: { issueDate: proposal.issueDate, expiryDate, renewals: { create: { issueDate: proposal.issueDate, expiryDate } } },
  });
}

/** Il socio dovrà riattivare l'account; le sessioni esistenti muoiono (sessionVersion). */
export async function resetAccess(db: Db, userId: string) {
  await db.user.update({ where: { id: userId }, data: { passwordHash: null, sessionVersion: { increment: 1 } } });
}

export async function setAdmin(db: Db, actorId: string, userId: string, isAdmin: boolean) {
  if (actorId === userId && !isAdmin) fail("CANNOT_DEMOTE_SELF");
  await db.user.update({ where: { id: userId }, data: { isAdmin } });
}
