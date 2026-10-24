"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, toLocale } from "@/i18n/locales";
import { prisma } from "@/server/db";
import { currentUser } from "@/server/guards";

export async function setLocaleAction(value: string) {
  const locale = toLocale(value);
  const user = await currentUser();
  if (user) await prisma.user.update({ where: { id: user.id }, data: { locale } });
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
