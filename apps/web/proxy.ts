import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast redirect to sign-in for signed-out visitors. This only checks that a session cookie
 * exists (it can't validate it), so pages and API routes still verify the session themselves.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ["/new/:path*", "/dashboard/:path*", "/settings/:path*"],
};
