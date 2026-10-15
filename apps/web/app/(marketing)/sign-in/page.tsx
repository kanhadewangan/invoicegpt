import type { Metadata } from "next";
import { Check } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleSignIn } from "@/components/google-sign-in";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert, Logo } from "@/components/ui";
import { safeNextPath } from "@/lib/auth-client";
import { isGoogleConfigured } from "@/lib/server/auth";
import { getSession } from "@/lib/server/current-user";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getSession()) redirect(next);

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="animate-breathe pointer-events-none absolute inset-x-0 -top-32 h-[520px] bg-[radial-gradient(ellipse_at_top,var(--brand-soft),transparent_65%)]"
      />
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="animate-dialog relative w-full max-w-sm">
        <Link href="/" className="mx-auto flex w-fit">
          <Logo />
        </Link>
        <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-pop sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">Sign in to InvoiceGPT</h1>
          <p className="mt-1 text-sm text-muted">Your invoices, clients and connected tools stay in your account.</p>

          <div className="mt-6 space-y-3">
            {params.error && (
              <Alert title="Google sign-in didn't complete">Please try again. If it keeps failing, check the Google OAuth setup.</Alert>
            )}
            {isGoogleConfigured ? (
              <GoogleSignIn next={next} />
            ) : (
              <Alert title="Google sign-in isn't set up yet">
                Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to apps/web/.env.local, then restart the dev server.
              </Alert>
            )}
          </div>

          <ul className="mt-6 space-y-2 border-t border-line pt-5 text-sm text-muted">
            {["No password to remember", "We only read your name, email and photo"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 text-center text-xs text-faint">
          <Link href="/" className="hover:text-fg">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
