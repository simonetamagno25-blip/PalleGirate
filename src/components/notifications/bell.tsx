"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { markAllReadAction, markReadAction } from "@/app/(app)/notifications/actions";
import { NotificationText } from "./notification-text";

export type BellItem = { id: string; type: string; params: Record<string, string | number>; read: boolean };

export function NotificationBell({ unread, items }: { unread: number; items: BellItem[] }) {
  const t = useTranslations("notifications");
  const badge = unread > 99 ? "99+" : String(unread);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9" aria-label={`${t("title")} · ${t("unread", { count: unread })}`}>
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {badge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {items.length === 0 && <p className="p-3 text-sm text-muted-foreground">{t("empty")}</p>}
        {items.map((n) => (
          <DropdownMenuItem key={n.id} className={n.read ? "text-muted-foreground" : "font-medium"} onSelect={() => !n.read && markReadAction(n.id)}>
            <span className="text-sm"><NotificationText type={n.type} params={n.params} /></span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="flex justify-between p-1">
          <Button variant="ghost" size="sm" onClick={() => markAllReadAction()}>{t("markAll")}</Button>
          <Button variant="ghost" size="sm" asChild><Link href="/notifications">{t("title")}</Link></Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
