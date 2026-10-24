import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * The page title row: the h1 in the display face, an optional one-line description, the page's own actions on the
 * right, and an optional way back to the parent list. Same shape on every member and admin page.
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="space-y-1">
      {back && (
        <Link
          href={back.href}
          className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-md pr-2 text-[0.9375rem] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <ChevronLeft className="size-5" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 space-y-1">
          <h1 className="font-display text-2xl font-bold text-balance md:text-3xl">{title}</h1>
          {description && <p className="text-base text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
