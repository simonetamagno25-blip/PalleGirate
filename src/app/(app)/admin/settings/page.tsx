import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FieldHeader, FieldRow } from "@/components/admin/field-row";
import { SettingsForm } from "@/components/admin/settings-form";
import { PageHeader } from "@/components/common/page-header";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { getSettings } from "@/server/settings";

export default async function SettingsPage() {
  await requireAdmin();
  const t = await getTranslations("settings");
  const [settings, fields] = await Promise.all([getSettings(prisma), prisma.field.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })]);
  const h2 = "text-xl font-semibold";
  return (
    <div className="space-y-10">
      <PageHeader title={t("title")} />

      <section aria-labelledby="rules" className="space-y-3">
        <div className="space-y-1">
          <h2 id="rules" className={h2}>{t("rules")}</h2>
          <p className="text-base text-muted-foreground">{t("rulesHint")}</p>
        </div>
        <Card><CardContent><SettingsForm settings={settings} /></CardContent></Card>
      </section>

      <section aria-labelledby="fields" className="space-y-3">
        <div className="space-y-1">
          <h2 id="fields" className={h2}>{t("fields")}</h2>
          <p className="text-base text-muted-foreground">{t("fieldsHint")}</p>
        </div>
        <Card>
          <CardContent>
            <FieldHeader />
            <div className="divide-y">
              {fields.map((f) => <FieldRow key={f.id} field={f} />)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h3 className="text-lg leading-snug font-semibold">{t("addField")}</h3></CardHeader>
          <CardContent>
            <FieldHeader />
            <FieldRow field={{ id: null, name: "", sport: "TENNIS", slotMinutes: 60, priceCents: 0, sortOrder: fields.length + 1, active: true }} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
