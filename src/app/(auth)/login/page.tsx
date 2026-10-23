import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">{t("loginTitle")}</h1>
      <LoginForm />
    </>
  );
}
