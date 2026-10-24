import { getTranslations } from "next-intl/server";
import { Loader2 } from "lucide-react";

/** Mostrato subito al click su una voce del menu, mentre il server prepara la pagina. */
export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="flex items-center gap-2 text-base text-muted-foreground">
        <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
        <span>{t("loading")}</span>
      </div>
      <div className="h-9 w-56 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      <div className="board-surface space-y-3 rounded-lg p-4 ring-1 ring-flap-seam md:p-5">
        <div className="h-5 w-40 rounded-sm bg-flap" />
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => <div key={i} className="flap-face flap-hinge h-14 w-9" />)}
        </div>
        <div className="h-4 w-48 rounded-sm bg-flap" />
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
    </div>
  );
}
