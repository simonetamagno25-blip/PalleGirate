"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { logoutAction } from "@/app/(app)/auth-actions";
import { ADMIN_NAV, MEMBER_NAV, NavLink, isActive } from "./app-nav";

/** Phone menu: every destination (the tab bar shows only four), plus the admin group and logout. */
export function MobileMenu({ isAdmin, userName }: { isAdmin: boolean; userName: string }) {
  const t = useTranslations("common");
  const tn = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-flap-ink hover:bg-flap hover:text-flap-ink md:hidden" aria-label={t("menu")}>
          <Menu className="size-6" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 max-w-[85vw] gap-0 overflow-y-auto bg-card">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>{t("menu")}</SheetTitle>
          <p className="text-base text-muted-foreground">{userName}</p>
        </SheetHeader>
        <nav aria-label={t("menu")} className="flex flex-col gap-1 p-3">
          {MEMBER_NAV.map((item) => <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} onNavigate={close} />)}
        </nav>
        {isAdmin && (
          <nav aria-labelledby="menu-admin" className="flex flex-col gap-1 border-t p-3">
            <h2 id="menu-admin" className="px-3 pt-1 pb-1 text-sm font-semibold text-muted-foreground">{tn("admin")}</h2>
            {ADMIN_NAV.map((item) => <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} onNavigate={close} />)}
          </nav>
        )}
        <form action={logoutAction} className="mt-auto border-t p-3">
          <Button variant="ghost" className="w-full justify-start gap-3 px-3" type="submit">
            <LogOut className="size-5" aria-hidden /> {tn("logout")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
