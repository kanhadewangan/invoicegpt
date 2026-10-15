import "server-only";
import type { NotionConnection } from "@repo/db";
import {
  createNotionClient,
  isNotionUnauthorized,
  refreshNotionToken,
  type NotionClient,
  type NotionOAuthConfig,
} from "@repo/notion";
import { decryptSecret, encryptSecret } from "./crypto";
import { requireEnv } from "./env";
import { db } from "./services";

/** Cookie holding the OAuth `state` between /api/notion/connect and the callback. */
export const NOTION_STATE_COOKIE = "notion_oauth_state";

export const isNotionConfigured = Boolean(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET);

export function notionOAuthConfig(): NotionOAuthConfig {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return {
    clientId: requireEnv("NOTION_CLIENT_ID"),
    clientSecret: requireEnv("NOTION_CLIENT_SECRET"),
    redirectUri: new URL("/api/notion/callback", base).toString(),
  };
}

/** Thrown when the user has no working Notion connection; the UI asks them to (re)connect. */
export class NotionNotConnectedError extends Error {
  constructor(readonly reason: "missing" | "reconnect") {
    super(
      reason === "missing"
        ? "Connect Notion in Settings first."
        : "Notion access expired. Reconnect Notion in Settings.",
    );
  }
}

export function getNotionConnection(userId: string): Promise<NotionConnection | null> {
  return db().notionConnection.findUnique({ where: { userId } });
}

async function refresh(connection: NotionConnection): Promise<string | null> {
  if (!connection.refreshToken) return null;
  try {
    const tokens = await refreshNotionToken(notionOAuthConfig(), decryptSecret(connection.refreshToken));
    await db().notionConnection.update({
      where: { id: connection.id },
      data: {
        // Each refresh returns a new pair; the old refresh token stops working.
        accessToken: encryptSecret(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
        status: "ACTIVE",
      },
    });
    return tokens.accessToken;
  } catch {
    return null;
  }
}

/**
 * Runs `fn` with an authorised Notion client for this user. Notion doesn't say when tokens
 * expire, so on a 401 we refresh once and retry; if that fails the connection is flagged and
 * the user is asked to reconnect.
 */
export async function withNotion<T>(
  userId: string,
  fn: (client: NotionClient, connection: NotionConnection) => Promise<T>,
): Promise<T> {
  const connection = await getNotionConnection(userId);
  if (!connection) throw new NotionNotConnectedError("missing");
  if (connection.status === "NEEDS_RECONNECT") throw new NotionNotConnectedError("reconnect");

  try {
    return await fn(createNotionClient(decryptSecret(connection.accessToken)), connection);
  } catch (error) {
    if (!isNotionUnauthorized(error)) throw error;
    const accessToken = await refresh(connection);
    if (!accessToken) {
      await db().notionConnection.update({ where: { id: connection.id }, data: { status: "NEEDS_RECONNECT" } });
      throw new NotionNotConnectedError("reconnect");
    }
    return fn(createNotionClient(accessToken), connection);
  }
}
