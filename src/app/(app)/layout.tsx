import { requireUser } from "@/server/guards";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <AppNav isAdmin={user.isAdmin} userName={`${user.firstName} ${user.lastName}`} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:pb-6">{children}</main>
    </div>
  );
}
