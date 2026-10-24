"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action-result";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { setNoShow, setPaymentStatus, type PaymentStatus } from "@/server/payments";

export async function setPaymentAction(bookingId: string, status: PaymentStatus) {
  await requireAdmin();
  const r = await runAction(() => setPaymentStatus(prisma, bookingId, status).then(() => null));
  revalidatePath("/admin", "layout");
  return r;
}

export async function setNoShowAction(bookingId: string, noShow: boolean) {
  await requireAdmin();
  const r = await runAction(() => setNoShow(prisma, bookingId, noShow).then(() => null));
  revalidatePath("/admin/payments");
  return r;
}
