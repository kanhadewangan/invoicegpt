"use client";

import { FilePlus2, LayoutDashboard, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";
import { Avatar, SignOutButton, type ShellUser } from "./user-menu";
import { Logo } from "./ui";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/new", label: "New invoice", icon: FilePlus2 },
  { href: "/dashboard", label: "Invoices", icon: LayoutDashboard },
  { href: "/settings/integrations", label: "Integrations", icon: Settings },
];

function NavLinks({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  return NAV.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`group flex items-center gap-2.5 rounded-lg text-sm font-medium transition duration-150 ease-standard ${
          compact ? "px-3 py-1.5" : "px-3 py-2"
        } ${active ? "bg-surface text-fg shadow-card ring-1 ring-line" : "text-muted hover:bg-subtle hover:text-fg"}`}
      >
        <Icon className={`size-4 transition-transform duration-150 ease-standard group-hover:scale-110 ${active ? "text-brand-text" : ""}`} />
        {label}
      </Link>
    );
  });
}

export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-canvas px-4 py-5 lg:flex">
        <Link href="/" className="px-2">
          <Logo />
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-faint uppercase">Workspace</p>
          <NavLinks />
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-line bg-surface p-3 text-xs text-muted shadow-card">
            <p className="flex items-center gap-1.5 font-semibold text-fg">
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-warning opacity-60 [animation-duration:2.5s]" />
                <span className="relative size-1.5 rounded-full bg-warning" />
              </span>
              PayPal Sandbox
            </p>
            <p className="mt-1">Test mode: no real money moves.</p>
          </div>
          <div className="flex items-center justify-between gap-1 border-t border-line pt-3">
            <div className="flex min-w-0 items-center gap-2.5 px-1">
              <Avatar user={user} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-faint">{user.email}</p>
              </div>
            </div>
            <div className="flex shrink-0">
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SignOutButton />
            <Avatar user={user} className="ml-1 size-8" />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-3">
          <NavLinks compact />
        </nav>
      </header>

      <main className="min-w-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
