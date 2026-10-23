import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarDays, ClipboardList, LayoutDashboard, LogOut, PlusCircle, Settings, User, Users, Wallet, BarChart3 } from "lucide-react";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export async function AppNav({ isAdmin, userName }: { isAdmin: boolean; userName: string }) {
  const t = await getTranslations("nav");
  const member = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/calendar", label: t("calendar"), icon: CalendarDays },
    { href: "/book", label: t("book"), icon: PlusCircle },
    { href: "/bookings", label: t("bookings"), icon: ClipboardList },
    { href: "/profile", label: t("profile"), icon: User },
  ];
  const admin = [
    { href: "/admin/dashboard", label: t("adminDashboard"), icon: BarChart3 },
    { href: "/admin/members", label: t("adminMembers"), icon: Users },
    { href: "/admin/bookings", label: t("adminBookings"), icon: ClipboardList },
    { href: "/admin/payments", label: t("adminPayments"), icon: Wallet },
    { href: "/admin/settings", label: t("adminSettings"), icon: Settings },
  ];
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }
  const item = (l: (typeof member)[number]) => (
    <Link key={l.href} href={l.href} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent">
      <l.icon className="size-4" aria-hidden /> <span>{l.label}</span>
    </Link>
  );
  return (
    <>
      <aside className="hidden border-r bg-card md:flex md:flex-col md:gap-1 md:p-3">
        <p className="px-3 py-2 text-sm font-medium">{userName}</p>
        {member.map(item)}
        {isAdmin && <p className="mt-4 px-3 text-xs uppercase text-muted-foreground">{t("admin")}</p>}
        {isAdmin && admin.map(item)}
        <form action={logout} className="mt-auto">
          <Button variant="ghost" className="w-full justify-start" type="submit"><LogOut className="size-4" aria-hidden /> {t("logout")}</Button>
        </form>
      </aside>
      {/* Barra in basso su telefono: solo le voci principali del socio. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-card py-1 md:hidden">
        {member.slice(0, 4).map((l) => (
          <Link key={l.href} href={l.href} className="flex flex-col items-center px-2 py-1 text-xs">
            <l.icon className="size-5" aria-hidden /> <span>{l.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
