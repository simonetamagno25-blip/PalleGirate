import { z } from "zod";
import { releaseOccupancy } from "./bookings";
import type { Db } from "./db";
import { fail } from "./errors";
import { notify } from "./notifications";

const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export const START_STEPS = [15, 30, 60] as const;

export const settingsSchema = z
  .object({
    openMinutes: int(0, 1425),
    closeMinutes: int(15, 1440),
    // L'occupazione è a quarti d'ora: passi più fini non sono rappresentabili.
    startStepMinutes: z.coerce.number().refine((n) => (START_STEPS as readonly number[]).includes(n)),
    maxAdvanceDays: int(0, 365),
    maxActiveBookings: int(1, 50),
    changeWindowMinutes: int(0, 2880),
    maxSlotsPerBooking: int(1, 4),
    membershipWarningDays: int(0, 90),
    reminderHours: int(1, 168),
  })
  .refine((s) => s.closeMinutes > s.openMinutes && s.openMinutes % s.startStepMinutes === 0 && s.closeMinutes % 15 === 0);

export type SettingsInput = z.input<typeof settingsSchema>;

export async function updateSettings(db: Db, input: SettingsInput) {
  const r = settingsSchema.safeParse(input);
  if (!r.success) return fail("INVALID_INPUT");
  return db.settings.upsert({ where: { id: 1 }, update: r.data, create: { id: 1, ...r.data } });
}

export const SPORTS = ["FOOTBALL", "TENNIS", "BASKETBALL", "BOCCE"] as const;

export const fieldSchema = z.object({
  name: z.string().trim().min(1).max(60),
  sport: z.enum(SPORTS),
  slotMinutes: z.coerce.number().int().refine((n) => n >= 15 && n <= 240 && n % 15 === 0),
  priceCents: z.coerce.number().int().min(0).max(1_000_000),
  sortOrder: z.coerce.number().int().min(0).max(1000),
});

export type FieldInput = { name: string; sport: string; slotMinutes: number; priceCents: number; sortOrder: number };

const parseField = (input: FieldInput) => {
  const r = fieldSchema.safeParse(input);
  return r.success ? r.data : fail("INVALID_INPUT");
};

export const createField = (db: Db, input: FieldInput) => db.field.create({ data: parseField(input) });
export const updateField = (db: Db, id: string, input: FieldInput) => db.field.update({ where: { id }, data: parseField(input) });

export const futureBookingsCount = (db: Db, fieldId: string, now = new Date()) =>
  db.booking.count({ where: { fieldId, status: "CONFIRMED", start: { gt: now } } });

export async function deactivateField(db: Db, adminId: string, fieldId: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    const future = await tx.booking.findMany({ where: { fieldId, status: "CONFIRMED", start: { gt: now } }, include: { field: true } });
    for (const b of future) {
      await tx.booking.update({ where: { id: b.id }, data: { status: "CANCELLED", chargeable: false, cancelledById: adminId, cancelledAt: now } });
      await releaseOccupancy(tx, b.id);
      await notify(tx, b.memberId, "BOOKING_CANCELLED", { field: b.field.name, start: b.start.toISOString(), by: "admin", chargeable: 0 });
    }
    await tx.field.update({ where: { id: fieldId }, data: { active: false } });
    return future.length;
  });
}

export async function activateField(db: Db, fieldId: string) {
  await db.field.update({ where: { id: fieldId }, data: { active: true } });
}
