import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/server/guards";
import { prisma } from "@/server/db";
import { ensureTimedNotifications, listNotifications, unreadCount } from "@/server/notifications";
import { BottomNav, SideNav } from "@/components/layout/app-nav";
import { NotificationBell } from "@/components/notifications/bell";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MobileMenu } from "@/components/layout/mobile-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await ensureTimedNotifications(prisma, user.id);
  const [unread, latest] = await Promise.all([unreadCount(prisma, user.id), listNotifications(prisma, user.id, 8)]);
  const bellItems = latest.map((n) => ({ id: n.id, type: n.type, params: JSON.parse(n.params), read: n.read, createdAt: n.createdAt.toISOString() }));
  const t = await getTranslations("app");
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Black top bar on every width: the board's frame. */}
      <header className="board-surface sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1 px-1.5 md:px-4">
        <MobileMenu isAdmin={user.isAdmin} userName={`${user.firstName} ${user.lastName}`} />
        <Link href="/dashboard" className="flex h-11 items-center gap-2.5 rounded-md px-1.5">
          <Image src="/icons/icon.svg" alt="" width={24} height={24} unoptimized className="size-6" />
          <span className="font-display text-xl leading-none font-extrabold tracking-[0.04em] text-flap-ink uppercase">{t("name")}</span>
        </Link>
        <div className="ml-auto flex items-center gap-0.5">
          <LocaleSwitcher onBoard />
          <ThemeToggle />
          <NotificationBell unread={unread} items={bellItems} />
        </div>
      </header>
      <div className="flex-1 md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
        <SideNav isAdmin={user.isAdmin} userName={`${user.firstName} ${user.lastName}`} />
        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-[calc(72px+env(safe-area-inset-bottom)+2rem)] md:px-8 md:pt-8 md:pb-12">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
