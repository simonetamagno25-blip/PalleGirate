import { getTranslations } from "next-intl/server";
import { ActivateForm } from "./activate-form";

export default async function ActivatePage() {
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">{t("activateTitle")}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t("activateIntro")}</p>
      <ActivateForm />
    </>
  );
}
