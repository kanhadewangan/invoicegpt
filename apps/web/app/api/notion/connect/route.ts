import { randomBytes } from "node:crypto";
import { notionAuthorizeUrl } from "@repo/notion";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/current-user";
import { isNotionConfigured, NOTION_STATE_COOKIE, notionOAuthConfig } from "@/lib/server/notion";

/** Starts the Notion OAuth flow: the user picks a workspace and which pages/databases to share. */
export async function GET(request: Request) {
  const settings = new URL("/settings/integrations", request.url);
  if (!(await getSession())) {
    return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent("/settings/integrations")}`, request.url));
  }
  if (!isNotionConfigured) {
    settings.searchParams.set("notion", "not_configured");
    return NextResponse.redirect(settings);
  }

  // CSRF protection: the callback must echo this random state back.
  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(notionAuthorizeUrl(notionOAuthConfig(), state));
  res.cookies.set(NOTION_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/notion",
    maxAge: 10 * 60,
  });
  return res;
}
