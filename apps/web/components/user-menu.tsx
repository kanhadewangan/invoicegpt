"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Spinner } from "./ui";

export type ShellUser = { name: string; email: string; image: string | null };

export function Avatar({ user, className = "size-8" }: { user: ShellUser; className?: string }) {
  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return user.image ? (
    // eslint-disable-next-line @next/next/no-img-element -- Google profile photo; tiny and external
    <img src={user.image} alt="" referrerPolicy="no-referrer" className={`${className} shrink-0 rounded-full object-cover`} />
  ) : (
    <span
      className={`${className} grid shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-text`}
    >
      {initials || "?"}
    </span>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      title="Sign out"
      aria-label="Sign out"
      className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-subtle hover:text-fg disabled:opacity-50"
    >
      {loading ? <Spinner /> : <LogOut className="size-4" />}
    </button>
  );
}
