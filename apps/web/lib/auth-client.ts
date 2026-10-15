import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

/** Only same-site paths are allowed as post-sign-in destinations (prevents open redirects). */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
