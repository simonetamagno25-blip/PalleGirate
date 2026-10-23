"use server";

import { revalidatePath } from "next/cache";
import { freeStarts } from "@/lib/calendar/free-starts";
import { romeDay, romeInstant, romeMinutesOfDay } from "@/lib/time/rome";
import { runAction } from "@/server/action-result";
import { busyForField } from "@/server/availability";
import { cancelBooking, createBooking, updateBooking, type Actor } from "@/server/bookings";
import { prisma } from "@/server/db";
import { fail } from "@/server/errors";
import { requireUser } from "@/server/guards";
import { getSettings } from "@/server/settings";
import { daySchema, submitSchema } from "./schema";
import type { z } from "zod";

export async function freeStartsAction(p: { fieldId: string; day: string; excludeBookingId?: string }) {
  await requireUser();
  if (!daySchema.safeParse(p.day).success) return [];
  const [field, settings] = await Promise.all([prisma.field.findUnique({ where: { id: p.fieldId } }), getSettings(prisma)]);
  if (!field) return [];
  const now = new Date();
  const today = romeDay(now);
  if (p.day < today) return [];
  return freeStarts({
    slotMinutes: field.slotMinutes,
    settings,
    busy: await busyForField(prisma, field.id, p.day, p.excludeBookingId),
    notBeforeMinute: p.day === today ? romeMinutesOfDay(now) : undefined,
  });
}

export async function submitBookingAction(raw: z.input<typeof submitSchema>) {
  const user = await requireUser();
  return runAction(async () => {
    const p = submitSchema.safeParse(raw);
    if (!p.success) return fail("INVALID_INPUT");
    const v = p.data;
    // Solo un admin può agire come admin; un socio prenota sempre per sé.
    const actor: Actor = { userId: user.id, mode: v.mode === "admin" && user.isAdmin ? "admin" : "member" };
    const memberId = actor.mode === "admin" && v.memberId ? v.memberId : user.id;
    const input = { fieldId: v.fieldId, start: romeInstant(v.day, v.minute), slots: v.slots };
    const booking = v.bookingId ? await updateBooking(prisma, actor, v.bookingId, input) : await createBooking(prisma, actor, memberId, input);
    revalidatePath("/calendar");
    revalidatePath("/bookings");
    return { id: booking.id };
  });
}

export async function cancelBookingAction(p: { bookingId: string; reason?: string; mode: "member" | "admin" }) {
  const user = await requireUser();
  return runAction(async () => {
    const actor: Actor = { userId: user.id, mode: p.mode === "admin" && user.isAdmin ? "admin" : "member" };
    await cancelBooking(prisma, actor, p.bookingId, p.reason?.slice(0, 500));
    revalidatePath("/calendar");
    revalidatePath("/bookings");
    return null;
  });
}
