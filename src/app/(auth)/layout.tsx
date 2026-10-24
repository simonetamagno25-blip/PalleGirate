import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";

/** Login and activation: the black logo bar on top, then one narrow centered column on the page ground. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("app");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="board-surface flex h-14 shrink-0 items-center gap-1 px-3 md:px-4">
        <span className="flex h-11 items-center gap-2.5 px-1.5">
          <Image src="/icons/icon.svg" alt="" width={24} height={24} unoptimized className="size-6" />
          <span className="font-display text-xl leading-none font-extrabold tracking-[0.04em] text-flap-ink uppercase">{t("name")}</span>
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <LocaleSwitcher onBoard />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10 sm:py-16">{children}</main>
    </div>
  );
}
