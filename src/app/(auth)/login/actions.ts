"use server";

import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { signIn } from "@/auth";
import { normalizeEmail } from "@/lib/auth/normalize";
import { LOCALE_COOKIE } from "@/i18n/locales";
import { prisma } from "@/server/db";
import type { ActionResult } from "@/server/action-result";

export async function loginAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const email = String(form.get("email") ?? "");
  try {
    await signIn("credentials", { email, password: String(form.get("password") ?? ""), redirect: false });
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, violations: [{ code: "INVALID_CREDENTIALS" }] };
    throw e;
  }
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (user) (await cookies()).set(LOCALE_COOKIE, user.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return { ok: true, data: null };
}
