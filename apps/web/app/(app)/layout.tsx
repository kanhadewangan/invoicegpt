import { AppShell } from "@/components/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // No login yet, so the sidebar shows the demo user configured in .env.local.
  return <AppShell userName={process.env.DEMO_USER_NAME ?? "Demo Freelancer"}>{children}</AppShell>;
}
