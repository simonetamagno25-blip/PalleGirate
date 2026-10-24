import { getTranslations } from "next-intl/server";
import { Loader2 } from "lucide-react";

/** Mostrato subito al click su una voce del menu, mentre il server prepara la pagina. */
export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        <span>{t("loading")}</span>
      </div>
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
