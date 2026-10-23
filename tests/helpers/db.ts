import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";

let counter = 0;
const next = () => ++counter;

export async function resetDb() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.strike.deleteMany(),
    prisma.fieldOccupancy.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.membershipRenewal.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.user.deleteMany(),
    prisma.field.deleteMany(),
    prisma.settings.deleteMany(),
  ]);
}

export function makeSettings(data: Partial<{ maxActiveBookings: number; reminderHours: number; membershipWarningDays: number }> = {}) {
  return prisma.settings.create({ data: { id: 1, ...data } });
}

export function makeField(data: Partial<{ name: string; sport: string; slotMinutes: number; priceCents: number; active: boolean }> = {}) {
  return prisma.field.create({
    data: { name: `Tennis ${next()}`, sport: "TENNIS", slotMinutes: 60, priceCents: 1800, ...data },
  });
}

export async function makeMember(opts: { expiryDate?: string | null; email?: string; number?: string; password?: string | null; isAdmin?: boolean } = {}) {
  const n = next();
  const password = opts.password === undefined ? "password123" : opts.password;
  return prisma.user.create({
    data: {
      firstName: "Mario",
      lastName: `Rossi${n}`,
      email: opts.email ?? `socio${n}@example.it`,
      passwordHash: password ? await bcrypt.hash(password, 4) : null,
      isAdmin: opts.isAdmin ?? false,
      membership:
        opts.expiryDate === null
          ? undefined
          : { create: { number: opts.number ?? `T${1000 + n}`, issueDate: "2026-06-30", expiryDate: opts.expiryDate ?? "2027-06-30" } },
    },
    include: { membership: true },
  });
}

export function makeAdmin() {
  return makeMember({ expiryDate: null, isAdmin: true });
}
