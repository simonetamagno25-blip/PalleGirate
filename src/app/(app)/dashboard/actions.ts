"use server";

import { addDays, isValidDay, romeDay } from "@/lib/time/rome";
import { getDayBoard, type DayBoard } from "@/server/availability";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

/**
 * The home departures board for another day of the strip. Always the member view (no names, even for an admin),
 * and only inside the booking horizon: today … today + maxAdvanceDays.
 */
export async function dayBoardAction(day: string): Promise<DayBoard | null> {
  const user = await requireUser();
  const now = new Date();
  const today = romeDay(now);
  const settings = await getSettings(prisma);
  if (!isValidDay(day) || day < today || day > addDays(today, settings.maxAdvanceDays)) return null;
  return getDayBoard(prisma, day, { userId: user.id, isAdmin: false }, now);
}
