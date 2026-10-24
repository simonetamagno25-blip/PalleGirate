"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { logoutAction } from "@/app/(app)/auth-actions";

export function MobileMenu({ links }: { links: { href: string; label: string; section?: string }[] }) {
  const t = useTranslations("common");
  const tn = useTranslations("nav");
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 md:hidden" aria-label={t("menu")}><Menu className="size-5" /></Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto">
        <SheetHeader><SheetTitle>{t("menu")}</SheetTitle></SheetHeader>
        <nav className="flex flex-col gap-1 px-2 pb-4">
          {links.map((l) => (
            <div key={l.href}>
              {l.section && <p className="mt-4 px-3 text-xs uppercase text-muted-foreground">{l.section}</p>}
              <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2.5 text-sm hover:bg-accent">{l.label}</Link>
            </div>
          ))}
          <form action={logoutAction} className="mt-4 border-t pt-2">
            <Button variant="ghost" className="w-full justify-start" type="submit"><LogOut className="size-4" aria-hidden /> {tn("logout")}</Button>
          </form>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
