import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@repo/db";
import { exchangeNotionCode } from "@repo/notion";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/server/crypto";
import { getSession } from "@/lib/server/current-user";
import { NOTION_STATE_COOKIE, notionOAuthConfig } from "@/lib/server/notion";
import { db } from "@/lib/server/services";

function sameState(a: string | undefined, b: string | null): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Clears the chosen databases when the user connects a different workspace.
const RESET_SETUP = {
  tasksDataSourceId: null,
  tasksMapping: Prisma.DbNull,
  followUpsDataSourceId: null,
  followUpsMapping: Prisma.DbNull,
  lastTasksSyncAt: null,
};

/** Notion redirects here after the user approves (or cancels) access. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const done = (result: string) => {
    const res = NextResponse.redirect(new URL(`/settings/integrations?notion=${result}`, request.url));
    res.cookies.delete({ name: NOTION_STATE_COOKIE, path: "/api/notion" });
    return res;
  };

  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/sign-in?next=/settings/integrations", request.url));

  // CSRF: the state must match the one we set when the flow started.
  const expected = (await cookies()).get(NOTION_STATE_COOKIE)?.value;
  if (!sameState(expected, url.searchParams.get("state"))) return done("state_mismatch");
  if (url.searchParams.get("error")) return done("cancelled");
  const code = url.searchParams.get("code");
  if (!code) return done("error");

  try {
    const tokens = await exchangeNotionCode(notionOAuthConfig(), code);
    const userId = session.user.id;
    const existing = await db().notionConnection.findUnique({ where: { userId }, select: { workspaceId: true } });
    const connection = {
      status: "ACTIVE" as const,
      workspaceId: tokens.workspaceId,
      workspaceName: tokens.workspaceName,
      workspaceIcon: tokens.workspaceIcon,
      botId: tokens.botId,
      accessToken: encryptSecret(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
    };
    await db().notionConnection.upsert({
      where: { userId },
      create: { userId, ...connection },
      // Reconnecting the same workspace (e.g. to share more pages) keeps the setup.
      update: existing?.workspaceId === tokens.workspaceId ? connection : { ...connection, ...RESET_SETUP },
    });
    return done("connected");
  } catch (error) {
    console.error(error);
    return done("error");
  }
}
