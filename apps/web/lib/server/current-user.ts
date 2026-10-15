import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth, type SessionUser } from "./auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("Please sign in to continue.");
  }
}

/** The signed-in session for this request (deduplicated across a render), or null. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** For API routes: the signed-in user's id, or throws UnauthorizedError (a 401 via errorResponse). */
export async function getCurrentUserId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session.user.id;
}

/**
 * For pages: the signed-in user, or a redirect to sign-in. proxy.ts only checks that a session
 * cookie exists, so every protected page must still call this.
 */
export async function requireUser(returnTo: string): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  return session.user;
}
