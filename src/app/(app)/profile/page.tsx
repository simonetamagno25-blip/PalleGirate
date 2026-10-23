import { getFormatter, getTranslations } from "next-intl/server";
import { daysUntilExpiry } from "@/lib/membership";
import { romeDay } from "@/lib/time/rome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/server/guards";

export default async function ProfilePage() {
  const user = await requireUser();
  const t = await getTranslations("profile");
  const tm = await getTranslations("members");
  const format = await getFormatter();
  const m = user.membership;
  const date = (d: string) => format.dateTime(new Date(`${d}T12:00:00Z`), { dateStyle: "long" });
  const days = m ? daysUntilExpiry(m.expiryDate, romeDay(new Date())) : null;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <Card>
        <CardHeader><CardTitle>{t("card")}</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {!m && <p>{t("noCard")}</p>}
          {m && <p>{t("number")}: <span className="font-mono">{m.number}</span></p>}
          {m && days !== null && days >= 0 && <p>{t("expires", { date: date(m.expiryDate) })} · {t("daysLeft", { days })}</p>}
          {m && days !== null && days < 0 && <p className="text-destructive">{t("expired", { date: date(m.expiryDate) })}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("data")}</CardTitle></CardHeader>
        <CardContent className="grid gap-1 text-sm sm:grid-cols-2">
          <p>{tm("firstName")}: {user.firstName}</p>
          <p>{tm("lastName")}: {user.lastName}</p>
          <p>{tm("email")}: {user.email}</p>
          {user.phone && <p>{tm("phone")}: {user.phone}</p>}
          {user.birthDate && <p>{tm("birthDate")}: {date(user.birthDate)}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
