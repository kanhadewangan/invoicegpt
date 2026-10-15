import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/server/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/dashboard");
  return <AppShell user={{ name: user.name, email: user.email, image: user.image ?? null }}>{children}</AppShell>;
}
