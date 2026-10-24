import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  const ta = await getTranslations("app");
  return (
    <>
      <h1 className="font-display text-3xl font-bold">{t("loginTitle")}</h1>
      <p className="mt-1 mb-6 text-base text-muted-foreground">{ta("tagline")}</p>
      <LoginForm />
    </>
  );
}
