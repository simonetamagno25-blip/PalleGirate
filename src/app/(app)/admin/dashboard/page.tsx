import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import type { Range } from "@/lib/stats/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { HourHeatmap } from "@/components/charts/hour-heatmap";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { KpiCard } from "@/components/common/kpi-card";
import { Money } from "@/components/common/money";
import { loadAdminDashboard } from "@/server/dashboard";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/guards";

const RANGES: Range[] = ["day", "week", "month"];

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireAdmin();
  const t = await getTranslations("adminDashboard");
  const format = await getFormatter();
  const sp = await searchParams;
  const range: Range = RANGES.includes(sp.range as Range) ? (sp.range as Range) : "week";
  const d = await loadAdminDashboard(prisma, range);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <div className="flex gap-1 rounded-lg border p-1">
          {RANGES.map((r) => (
            <Button key={r} size="sm" variant={r === range ? "default" : "ghost"} asChild><Link href={`?range=${r}`}>{t(r)}</Link></Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label={t("expected")} value={<Money cents={d.revenue.expectedCents} />} hint={t("last12")} />
        <KpiCard label={t("collected")} value={<Money cents={d.revenue.collectedCents} />} hint={t("last12")} />
        <KpiCard label={t("unpaid")} value={<Money cents={d.revenue.unpaidCents} />} tone={d.revenue.unpaidCents > 0 ? "warning" : "default"} hint={t("last12")} />
        <KpiCard label={t("noShows")} value={d.noShows} />
        <KpiCard label={t("blocked")} value={d.blockedMembers} tone={d.blockedMembers > 0 ? "danger" : "default"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartCard title={t("occupancy")} empty={t("noData")} data={d.occupancy.map((o) => ({ name: o.name, pct: Math.round(o.rate * 100) }))} xKey="name" yKey="pct" valueLabel={t("occupancyUnit")} />
        <LineChartCard
          title={t("trend")}
          empty={t("noData")}
          valueLabel={t("bookingsUnit")}
          data={d.trend.map((m) => ({ label: format.dateTime(new Date(`${m.month}-15T12:00:00Z`), { month: "short", year: "2-digit" }), count: m.count }))}
        />
      </div>
      <HourHeatmap title={t("heatmap")} cells={d.heatmap} fromHour={d.openHours.from} toHour={d.openHours.to} weekdayLabels={t("weekdays").split(",")} />
      <Card>
        <CardHeader><CardTitle className="text-base">{t("expiring")}</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {d.expiring.length === 0 && <p className="text-muted-foreground">{t("noExpiring")}</p>}
          {d.expiring.map((m) => (
            <div key={m.userId} className="flex justify-between">
              <Link className="hover:underline" href={`/admin/members/${m.userId}`}>{m.name}</Link>
              <span className="tabular-nums">{format.dateTime(new Date(`${m.expiryDate}T12:00:00Z`), { dateStyle: "medium" })}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
