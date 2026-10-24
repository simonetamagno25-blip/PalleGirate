import { requireUser } from "@/server/guards";
import { prisma } from "@/server/db";
import { ensureTimedNotifications, listNotifications, unreadCount } from "@/server/notifications";
import { AppNav } from "@/components/app-nav";
import { NotificationBell } from "@/components/notifications/bell";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await ensureTimedNotifications(prisma, user.id);
  const [unread, latest] = await Promise.all([unreadCount(prisma, user.id), listNotifications(prisma, user.id, 8)]);
  const bellItems = latest.map((n) => ({ id: n.id, type: n.type, params: JSON.parse(n.params), read: n.read }));
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <AppNav isAdmin={user.isAdmin} userName={`${user.firstName} ${user.lastName}`} />
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <LocaleSwitcher />
          <NotificationBell unread={unread} items={bellItems} />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
