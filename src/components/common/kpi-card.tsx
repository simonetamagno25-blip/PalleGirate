import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({ label, value, hint, tone = "default" }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "default" | "warning" | "danger" }) {
  return (
    <Card className={cn(tone === "warning" && "ring-amber-ink/60", tone === "danger" && "ring-destructive/70")}>
      <CardContent className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="font-display text-3xl font-bold">{value}</p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
