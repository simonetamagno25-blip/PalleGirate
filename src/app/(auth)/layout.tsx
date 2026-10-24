import { LocaleSwitcher } from "@/components/locale-switcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-8 flex justify-end"><LocaleSwitcher /></div>
      {children}
    </main>
  );
}
