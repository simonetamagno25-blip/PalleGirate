"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { markAllReadAction, markReadAction } from "@/app/(app)/notifications/actions";
import { cn } from "@/lib/utils";
import { NotificationText } from "./notification-text";

export type BellItem = { id: string; type: string; params: Record<string, string | number>; read: boolean; createdAt: string };

/** Amber dot for unread: always paired with bold text and a spoken "Non letta", never color alone. */
export function UnreadDot({ read }: { read: boolean }) {
  return <span aria-hidden className={cn("mt-2 size-2.5 shrink-0 rounded-full", read ? "bg-transparent" : "bg-lamp-amber ring-1 ring-amber-ink")} />;
}

export function NotificationBell({ unread, items }: { unread: number; items: BellItem[] }) {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const badge = unread > 99 ? "99+" : String(unread);
  const triggerLabel = t("title") + ", " + t("unread", { count: unread });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-flap-ink hover:bg-flap hover:text-flap-ink aria-expanded:bg-flap aria-expanded:text-flap-ink" aria-label={triggerLabel}>
          <Bell className="size-5" aria-hidden />
          {unread > 0 && (
            <span aria-hidden className="absolute top-1 right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-lamp-amber px-1 text-xs leading-none font-semibold text-[#111111]">
              {badge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-1rem))] p-0">
        <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
          <p className="text-base font-semibold">{t("title")}</p>
          {unread > 0 && <p className="text-sm text-muted-foreground">{t("unread", { count: unread })}</p>}
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {items.length === 0 && <p className="px-3 py-4 text-base text-muted-foreground">{t("empty")}</p>}
          {items.map((n) => (
            <DropdownMenuItem key={n.id} className="items-start gap-3 px-3 py-2.5" onSelect={() => !n.read && markReadAction(n.id)}>
              <UnreadDot read={n.read} />
              <span className="min-w-0 flex-1">
                {!n.read && <span className="sr-only">{t("unreadLabel")}</span>}
                <span className={cn("block text-[0.9375rem] leading-snug", n.read ? "text-muted-foreground" : "font-semibold text-foreground")}>
                  <NotificationText type={n.type} params={n.params} />
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{format.relativeTime(new Date(n.createdAt))}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="flex justify-between gap-2 p-2">
          <Button variant="ghost" size="sm" onClick={() => markAllReadAction()}>{t("markAll")}</Button>
          <Button variant="ghost" size="sm" asChild><Link href="/notifications">{t("title")}</Link></Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
