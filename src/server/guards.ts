import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isSessionValid } from "./accounts";
import { prisma } from "./db";

export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { membership: true } });
  return user && isSessionValid(user, session.user.sv) ? user : null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user || !user.passwordHash) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}
