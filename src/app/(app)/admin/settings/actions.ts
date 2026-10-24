"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action-result";
import { prisma } from "@/server/db";
import { activateField, createField, deactivateField, futureBookingsCount, updateField, updateSettings, type FieldInput, type SettingsInput } from "@/server/fields";
import { requireAdmin } from "@/server/guards";

const hhmmToMinutes = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

const NUMERIC = ["startStepMinutes", "maxAdvanceDays", "maxActiveBookings", "changeWindowMinutes", "maxSlotsPerBooking", "membershipWarningDays", "reminderHours"] as const;

export async function saveSettingsAction(_: unknown, form: FormData) {
  await requireAdmin();
  const get = (k: string) => String(form.get(k) ?? "");
  const close = hhmmToMinutes(get("closeMinutes"));
  const input = {
    ...Object.fromEntries(NUMERIC.map((k) => [k, get(k)])),
    openMinutes: hhmmToMinutes(get("openMinutes")),
    // Un campo "ora" non può esprimere 24:00: 00:00 in chiusura significa mezzanotte.
    closeMinutes: close === 0 ? 1440 : close,
  } as SettingsInput;
  const r = await runAction(() => updateSettings(prisma, input).then(() => null));
  revalidatePath("/", "layout");
  return r;
}

export async function saveFieldAction(id: string | null, input: Omit<FieldInput, "priceCents"> & { priceEuro: string }) {
  await requireAdmin();
  const { priceEuro, ...rest } = input;
  const data: FieldInput = { ...rest, priceCents: Math.round(Number(priceEuro.replace(",", ".")) * 100) };
  const r = await runAction(() => (id ? updateField(prisma, id, data) : createField(prisma, data)).then(() => null));
  revalidatePath("/admin/settings");
  return r;
}

export async function futureCountAction(fieldId: string) {
  await requireAdmin();
  return futureBookingsCount(prisma, fieldId);
}

export async function toggleFieldAction(fieldId: string, active: boolean) {
  const admin = await requireAdmin();
  const r = await runAction(async () => {
    if (active) await activateField(prisma, fieldId);
    else await deactivateField(prisma, admin.id, fieldId);
    return null;
  });
  revalidatePath("/", "layout");
  return r;
}
