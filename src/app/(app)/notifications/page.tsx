import { getFormatter, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UnreadDot } from "@/components/notifications/bell";
import { NotificationText } from "@/components/notifications/notification-text";
import { cn } from "@/lib/utils";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { listNotifications } from "@/server/notifications";
import { markAllReadAction, markReadAction } from "./actions";

export default async function NotificationsPage() {
  const user = await requireUser();
  const t = await getTranslations("notifications");
  const format = await getFormatter();
  const items = await listNotifications(prisma, user.id, 200);
  const unread = items.filter((n) => !n.read).length;
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{t("title")}</h1>
          {unread > 0 && <p className="text-base text-muted-foreground">{t("unread", { count: unread })}</p>}
        </div>
        {unread > 0 && <form action={markAllReadAction}><Button variant="outline">{t("markAll")}</Button></form>}
      </div>
      <Card className="py-0">
        {items.length === 0 && <p className="p-5 text-base text-muted-foreground">{t("empty")}</p>}
        <ul className="divide-y">
          {items.map((n) => (
            <li key={n.id} className="flex items-start gap-3 px-4 py-4 md:px-5">
              <UnreadDot read={n.read} />
              <div className="min-w-0 flex-1">
                {!n.read && <span className="sr-only">{t("unreadLabel")}</span>}
                <p className={cn("text-base leading-snug", n.read ? "text-muted-foreground" : "font-semibold text-foreground")}>
                  <NotificationText type={n.type} params={JSON.parse(n.params)} />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <time dateTime={n.createdAt.toISOString()}>{format.relativeTime(n.createdAt)}</time>
                </p>
                {/* Phone: the action sits under the text so the message keeps the full width. */}
                {!n.read && (
                  <form action={markReadAction.bind(null, n.id)} className="mt-1 -ml-3 sm:hidden">
                    <Button variant="ghost" size="sm" className="h-11 px-3 text-amber-ink">{t("markRead")}</Button>
                  </form>
                )}
              </div>
              {!n.read && (
                <form action={markReadAction.bind(null, n.id)} className="-my-1 hidden shrink-0 sm:block">
                  <Button variant="ghost" size="sm" className="h-11">{t("markRead")}</Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
