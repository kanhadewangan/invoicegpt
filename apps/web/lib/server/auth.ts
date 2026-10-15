import "server-only";
import { getDb } from "@repo/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

/** True once the Google OAuth client is filled in; the sign-in page explains what's missing otherwise. */
export const isGoogleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  // Set explicitly so OAuth callbacks never fall back to the wrong host.
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(getDb(), { provider: "postgresql" }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  account: {
    // Google verifies emails, so signing in links to an existing user with the same address
    // (that's how the old demo user's invoices carry over).
    accountLinking: { trustedProviders: ["google"] },
  },
  session: {
    // Skip a database read on most requests; sessions are re-checked every 5 minutes.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  // Must be last: lets Server Actions set auth cookies.
  plugins: [nextCookies()],
});

export type SessionUser = typeof auth.$Infer.Session.user;
