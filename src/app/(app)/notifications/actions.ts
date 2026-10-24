"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { markAllRead, markRead } from "@/server/notifications";

export async function markReadAction(id: string) {
  const user = await requireUser();
  await markRead(prisma, user.id, id);
  revalidatePath("/", "layout");
}

export async function markAllReadAction() {
  const user = await requireUser();
  await markAllRead(prisma, user.id);
  revalidatePath("/", "layout");
}
