import { getFormatter, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationText } from "@/components/notifications/notification-text";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { listNotifications } from "@/server/notifications";
import { markAllReadAction, markReadAction } from "./actions";

export default async function NotificationsPage() {
  const user = await requireUser();
  const t = await getTranslations("notifications");
  const format = await getFormatter();
  const items = await listNotifications(prisma, user.id, 200);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <form action={markAllReadAction}><Button variant="outline" size="sm">{t("markAll")}</Button></form>
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {items.length === 0 && <p className="p-4 text-sm text-muted-foreground">{t("empty")}</p>}
          {items.map((n) => (
            <div key={n.id} className="flex items-start justify-between gap-3 p-4">
              <div className={n.read ? "text-muted-foreground" : ""}>
                <p className="text-sm"><NotificationText type={n.type} params={JSON.parse(n.params)} /></p>
                <p className="text-xs text-muted-foreground">{format.relativeTime(n.createdAt)}</p>
              </div>
              {!n.read && (
                <form action={markReadAction.bind(null, n.id)}><Button variant="ghost" size="sm">{t("markRead")}</Button></form>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
