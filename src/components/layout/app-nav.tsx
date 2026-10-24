"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BarChart3, Bell, CalendarDays, CirclePlus, ClipboardList, House, LogOut, Settings, Ticket, User, Users, Wallet, type LucideIcon } from "lucide-react";
import { logoutAction } from "@/app/(app)/auth-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavKey = "dashboard" | "calendar" | "book" | "bookings" | "notifications" | "profile" | "adminDashboard" | "adminMembers" | "adminBookings" | "adminPayments" | "adminSettings";
export type NavItem = { href: string; key: NavKey; icon: LucideIcon };

export const MEMBER_NAV: NavItem[] = [
  { href: "/dashboard", key: "dashboard", icon: House },
  { href: "/calendar", key: "calendar", icon: CalendarDays },
  { href: "/book", key: "book", icon: CirclePlus },
  { href: "/bookings", key: "bookings", icon: Ticket },
  { href: "/notifications", key: "notifications", icon: Bell },
  { href: "/profile", key: "profile", icon: User },
];
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin/dashboard", key: "adminDashboard", icon: BarChart3 },
  { href: "/admin/members", key: "adminMembers", icon: Users },
  { href: "/admin/bookings", key: "adminBookings", icon: ClipboardList },
  { href: "/admin/payments", key: "adminPayments", icon: Wallet },
  { href: "/admin/settings", key: "adminSettings", icon: Settings },
];

/** True when `pathname` is the item's page or one of its sub-pages (e.g. /bookings/123/edit). */
export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** One nav row, 44px tall. Active = filled board black with an amber icon, never a side stripe. */
export function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-md px-3 text-base font-medium transition-colors duration-150",
        active ? "bg-nav-active text-flap-ink" : "text-foreground hover:bg-accent",
      )}
    >
      <Icon className={cn("size-5 shrink-0", active ? "text-lamp-amber" : "text-muted-foreground")} aria-hidden />
      <span>{t(item.key)}</span>
    </Link>
  );
}

export function SideNav({ isAdmin, userName }: { isAdmin: boolean; userName: string }) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  return (
    <aside className="hidden border-r bg-card md:block">
      <div className="sticky top-14 flex h-[calc(100dvh-3.5rem)] flex-col gap-1 overflow-y-auto p-3">
        <p className="truncate px-3 pt-1 pb-3 text-base font-semibold">{userName}</p>
        <nav aria-label={tc("menu")} className="flex flex-col gap-1">
          {MEMBER_NAV.map((item) => <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />)}
        </nav>
        {isAdmin && (
          <nav aria-labelledby="nav-admin" className="mt-6 flex flex-col gap-1">
            <h2 id="nav-admin" className="px-3 pb-1 text-sm font-semibold text-muted-foreground">{t("admin")}</h2>
            {ADMIN_NAV.map((item) => <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />)}
          </nav>
        )}
        <form action={logoutAction} className="mt-auto pt-4">
          <Button variant="ghost" className="w-full justify-start gap-3 px-3 text-muted-foreground" type="submit">
            <LogOut className="size-5" aria-hidden /> {t("logout")}
          </Button>
        </form>
      </div>
    </aside>
  );
}

/** Phone tab bar: the four member destinations, black, amber when active. Everything else lives in the menu. */
export function BottomNav() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  return (
    <nav aria-label={tc("menu")} className="board-surface fixed inset-x-0 bottom-0 z-40 border-t border-flap-seam pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid h-[72px] grid-cols-4">
        {MEMBER_NAV.slice(0, 4).map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 px-1 text-center text-xs leading-tight font-medium",
                  active ? "text-lamp-amber" : "text-flap-ink-muted hover:text-flap-ink",
                )}
              >
                <Icon className="size-6 shrink-0" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {/* The tab label must fit one line at 13px: "Le mie prenotazioni" gets its short form here only. */}
                <span className="max-w-full">{t(item.key === "bookings" ? "bookingsShort" : item.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
