import { getTranslations } from "next-intl/server";
import { ActivateForm } from "./activate-form";

export default async function ActivatePage() {
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-balance">{t("activateTitle")}</h1>
      <p className="mt-1 mb-6 text-base text-muted-foreground">{t("activateIntro")}</p>
      <ActivateForm />
    </>
  );
}
