"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/server/action-result";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { fail } from "@/server/errors";
import { setNoShow, setPaymentStatus, unpaidImpact, type PaymentStatus } from "@/server/payments";

const statusSchema = z.enum(["PAID", "UNPAID", "EXEMPT"]);

export async function setPaymentAction(bookingId: string, status: PaymentStatus) {
  await requireAdmin();
  const r = await runAction(async () => {
    const parsed = statusSchema.safeParse(status);
    if (!parsed.success) return fail("INVALID_INPUT");
    await setPaymentStatus(prisma, bookingId, parsed.data);
    return null;
  });
  revalidatePath("/admin", "layout");
  return r;
}

export async function unpaidImpactAction(bookingId: string) {
  await requireAdmin();
  return unpaidImpact(prisma, bookingId);
}

export async function setNoShowAction(bookingId: string, noShow: boolean) {
  await requireAdmin();
  const r = await runAction(() => setNoShow(prisma, bookingId, noShow).then(() => null));
  revalidatePath("/admin/payments");
  return r;
}
