/** A compact summary as a definition list: label left, value right, hairlines between rows. */
export function DefList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dl className={["divide-y", className].filter(Boolean).join(" ")}>{children}</dl>;
}

export function DefRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-[0.9375rem] text-muted-foreground">{label}</dt>
      <dd className="text-right text-base font-semibold">{children}</dd>
    </div>
  );
}
