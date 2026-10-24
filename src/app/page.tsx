import { redirect } from "next/navigation";
import { currentUser } from "@/server/guards";

export default async function Home() {
  const user = await currentUser();
  redirect(user?.isAdmin ? "/admin/dashboard" : "/dashboard");
}
