"use server";

import { activateAccount } from "@/server/accounts";
import { runAction, type ActionResult } from "@/server/action-result";
import { prisma } from "@/server/db";

export async function activateAction(_: ActionResult<{ userId: string }> | null, form: FormData) {
  return runAction(() =>
    activateAccount(prisma, {
      cardNumber: String(form.get("cardNumber") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    }),
  );
}
