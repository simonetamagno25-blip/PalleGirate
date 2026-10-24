import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldRow } from "@/components/admin/field-row";
import { SettingsForm } from "@/components/admin/settings-form";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { getSettings } from "@/server/settings";

export default async function SettingsPage() {
  await requireAdmin();
  const t = await getTranslations("settings");
  const [settings, fields] = await Promise.all([getSettings(prisma), prisma.field.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <Card>
        <CardHeader><CardTitle>{t("rules")}</CardTitle></CardHeader>
        <CardContent><SettingsForm settings={settings} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("fields")}</CardTitle></CardHeader>
        <CardContent>
          {fields.map((f) => <FieldRow key={f.id} field={f} />)}
          <p className="mt-4 text-sm font-medium">{t("addField")}</p>
          <FieldRow field={{ id: null, name: "", sport: "TENNIS", slotMinutes: 60, priceCents: 0, sortOrder: fields.length + 1, active: true }} />
        </CardContent>
      </Card>
    </div>
  );
}
