import { APIErrorCode, Client, isNotionClientError } from "@notionhq/client";

/**
 * Pinned API version. 2025-09-03 split databases into "data sources" (rows and schema live on
 * the data source); 2026-03-11 renamed `archived` to `in_trash`. The SDK defaults to an older
 * version, so always create clients through this module.
 */
export const NOTION_VERSION = "2026-03-11";

export type NotionClient = Client;

export function createNotionClient(accessToken: string): NotionClient {
  // The SDK retries 429/529 (and idempotent 5xx) with backoff on its own.
  return new Client({ auth: accessToken, notionVersion: NOTION_VERSION, timeoutMs: 20_000 });
}

/** Any error raised by the Notion SDK (API errors, timeouts, bad responses). */
export const isNotionError = isNotionClientError;

/** True when Notion rejected the token: expired, revoked, or the integration was removed. */
export function isNotionUnauthorized(error: unknown): boolean {
  return isNotionClientError(error) && error.code === APIErrorCode.Unauthorized;
}

/** True when the page/data source isn't shared with the integration (or no longer exists). */
export function isNotionNotFound(error: unknown): boolean {
  return (
    isNotionClientError(error) &&
    (error.code === APIErrorCode.ObjectNotFound || error.code === APIErrorCode.RestrictedResource)
  );
}

/** A short, user-facing message for any error thrown by the Notion SDK. */
export function notionErrorMessage(error: unknown): string {
  if (!isNotionClientError(error)) return "Notion request failed.";
  if (error.code === APIErrorCode.RateLimited) return "Notion is rate-limiting us. Try again in a minute.";
  if (isNotionUnauthorized(error)) return "Notion access expired. Reconnect Notion in Settings.";
  if (isNotionNotFound(error)) return "That Notion database isn't shared with InvoiceGPT any more.";
  return `Notion: ${error.message}`;
}
