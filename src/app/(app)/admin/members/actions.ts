"use server";

import { revalidatePath } from "next/cache";
import { romeDay } from "@/lib/time/rome";
import { runAction } from "@/server/action-result";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { createMember, renewMembership, resetAccess, setAdmin, updateMember, type MemberInput } from "@/server/members";

const fromForm = (f: FormData): MemberInput => ({
  firstName: String(f.get("firstName") ?? ""), lastName: String(f.get("lastName") ?? ""),
  birthDate: String(f.get("birthDate") ?? ""), email: String(f.get("email") ?? ""), phone: String(f.get("phone") ?? ""),
  cardNumber: String(f.get("cardNumber") ?? ""), issueDate: String(f.get("issueDate") ?? ""), expiryDate: String(f.get("expiryDate") ?? ""),
});

export async function saveMemberAction(userId: string | null, _: unknown, form: FormData) {
  await requireAdmin();
  const res = await runAction(async () => {
    const u = userId ? await updateMember(prisma, userId, fromForm(form)) : await createMember(prisma, fromForm(form));
    return { id: u.id };
  });
  revalidatePath("/admin/members");
  return res;
}

export async function renewAction(userId: string, expiryOverride: string) {
  await requireAdmin();
  const res = await runAction(() => renewMembership(prisma, userId, romeDay(new Date()), expiryOverride || undefined).then(() => null));
  revalidatePath(`/admin/members/${userId}`);
  return res;
}

export async function resetAccessAction(userId: string) {
  await requireAdmin();
  const res = await runAction(() => resetAccess(prisma, userId).then(() => null));
  revalidatePath(`/admin/members/${userId}`);
  return res;
}

export async function setAdminAction(userId: string, isAdmin: boolean) {
  const me = await requireAdmin();
  const res = await runAction(() => setAdmin(prisma, me.id, userId, isAdmin).then(() => null));
  revalidatePath(`/admin/members/${userId}`);
  return res;
}
