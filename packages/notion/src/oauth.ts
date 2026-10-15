import { Client } from "@notionhq/client";
import { NOTION_VERSION } from "./client";

export type NotionOAuthConfig = { clientId: string; clientSecret: string; redirectUri: string };

/** Where to send the user to pick a workspace and the pages/databases to share. */
export function notionAuthorizeUrl(config: NotionOAuthConfig, state: string): string {
  const url = new URL("https://api.notion.com/v1/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", "user");
  url.searchParams.set("state", state);
  return url.toString();
}

export type NotionTokens = {
  accessToken: string;
  /** Notion may or may not issue one; refreshes return a new pair that replaces the old. */
  refreshToken: string | null;
  botId: string;
  workspaceId: string;
  workspaceName: string | null;
  workspaceIcon: string | null;
};

const oauthClient = () => new Client({ notionVersion: NOTION_VERSION });

function toTokens(res: Awaited<ReturnType<Client["oauth"]["token"]>>): NotionTokens {
  return {
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
    botId: res.bot_id,
    workspaceId: res.workspace_id,
    workspaceName: res.workspace_name,
    workspaceIcon: res.workspace_icon,
  };
}

/** Server-side only: the token endpoint needs the client secret (and sends no CORS headers). */
export async function exchangeNotionCode(config: NotionOAuthConfig, code: string): Promise<NotionTokens> {
  return toTokens(
    await oauthClient().oauth.token({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  );
}

export async function refreshNotionToken(config: NotionOAuthConfig, refreshToken: string): Promise<NotionTokens> {
  return toTokens(
    await oauthClient().oauth.token({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  );
}

/** Best effort: revoking on disconnect is polite, but failure must not block it. */
export async function revokeNotionToken(config: NotionOAuthConfig, accessToken: string): Promise<void> {
  try {
    await oauthClient().oauth.revoke({
      token: accessToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });
  } catch {
    // Already revoked or removed by the user in Notion.
  }
}
