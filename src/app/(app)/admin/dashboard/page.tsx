import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import type { Range } from "@/lib/stats/admin";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { HourHeatmap } from "@/components/charts/hour-heatmap";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { KpiStrip } from "@/components/common/kpi-strip";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { segmentedGroup, segmentedItem } from "@/components/common/segmented";
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
      <PageHeader
        title={t("title")}
        actions={
          <nav aria-label={t("range")} className={segmentedGroup}>
            {RANGES.map((r) => (
              <Link key={r} href={`?range=${r}`} aria-current={r === range ? "true" : undefined} className={segmentedItem(r === range)}>
                {r === range && <Check className="size-4" strokeWidth={3} aria-hidden />}
                {t(r)}
              </Link>
            ))}
          </nav>
        }
      />

      <KpiStrip
        items={[
          { key: "expected", label: t("expected"), value: <Money cents={d.revenue.expectedCents} />, hint: t("last12") },
          { key: "collected", label: t("collected"), value: <Money cents={d.revenue.collectedCents} />, hint: t("last12") },
          { key: "unpaid", label: t("unpaid"), value: <Money cents={d.revenue.unpaidCents} />, hint: t("last12"), tone: d.revenue.unpaidCents > 0 ? "danger" : "default" },
          { key: "noShows", label: t("noShows"), value: d.noShows, hint: t(`period.${range}`) },
          { key: "blocked", label: t("blocked"), value: d.blockedMembers, hint: t("now"), tone: d.blockedMembers > 0 ? "danger" : "default" },
        ]}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <BarChartCard title={t("occupancy")} empty={t("noData")} data={d.occupancy.map((o) => ({ name: o.name, pct: Math.round(o.rate * 100) }))} xKey="name" yKey="pct" valueLabel={t("occupancyUnit")} />
        <LineChartCard
          title={t("trend")}
          empty={t("noData")}
          valueLabel={t("bookingsUnit")}
          data={d.trend.map((m) => ({ label: format.dateTime(new Date(`${m.month}-15T12:00:00Z`), { month: "short", year: "2-digit" }), count: m.count }))}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <HourHeatmap title={t("heatmap")} cells={d.heatmap} fromHour={d.openHours.from} toHour={d.openHours.to} weekdayLabels={t("weekdays").split(",")} />
        <Card>
          <CardHeader><h2 className="text-lg leading-snug font-semibold">{t("expiring")}</h2></CardHeader>
          <CardContent>
            {d.expiring.length === 0 ? (
              <p className="text-base text-muted-foreground">{t("noExpiring")}</p>
            ) : (
              <ul className="divide-y">
                {d.expiring.map((m) => (
                  <li key={m.userId} className="flex min-h-11 items-center justify-between gap-4 py-1.5">
                    <Link className="font-medium underline-offset-4 hover:underline" href={`/admin/members/${m.userId}`}>{m.name}</Link>
                    <span className="text-[0.9375rem] whitespace-nowrap text-muted-foreground">{format.dateTime(new Date(`${m.expiryDate}T12:00:00Z`), { dateStyle: "medium" })}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
