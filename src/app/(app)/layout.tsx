import { getTranslations } from "next-intl/server";
import { requireUser } from "@/server/guards";
import { prisma } from "@/server/db";
import { ensureTimedNotifications, listNotifications, unreadCount } from "@/server/notifications";
import { AppNav } from "@/components/layout/app-nav";
import { NotificationBell } from "@/components/notifications/bell";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MobileMenu } from "@/components/layout/mobile-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await ensureTimedNotifications(prisma, user.id);
  const [unread, latest] = await Promise.all([unreadCount(prisma, user.id), listNotifications(prisma, user.id, 8)]);
  const bellItems = latest.map((n) => ({ id: n.id, type: n.type, params: JSON.parse(n.params), read: n.read }));
  const tn = await getTranslations("nav");
  const links = [
    { href: "/dashboard", label: tn("dashboard") }, { href: "/calendar", label: tn("calendar") }, { href: "/book", label: tn("book") },
    { href: "/bookings", label: tn("bookings") }, { href: "/notifications", label: tn("notifications") }, { href: "/profile", label: tn("profile") },
    ...(user.isAdmin
      ? [
          { href: "/admin/dashboard", label: tn("adminDashboard"), section: tn("admin") }, { href: "/admin/members", label: tn("adminMembers") },
          { href: "/admin/bookings", label: tn("adminBookings") }, { href: "/admin/payments", label: tn("adminPayments") }, { href: "/admin/settings", label: tn("adminSettings") },
        ]
      : []),
  ];
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <AppNav isAdmin={user.isAdmin} userName={`${user.firstName} ${user.lastName}`} />
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <MobileMenu links={links} />
          <div className="ml-auto flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
            <NotificationBell unread={unread} items={bellItems} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
