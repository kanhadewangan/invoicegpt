import "server-only";

type SecretName =
  | "DATABASE_URL"
  | "PAYPAL_CLIENT_ID"
  | "PAYPAL_SECRET"
  | "PAYPAL_WEBHOOK_ID"
  | "LLM_API_KEY"
  | "NOTION_CLIENT_ID"
  | "NOTION_CLIENT_SECRET"
  | "TOKEN_ENCRYPTION_KEY";

export class ConfigError extends Error {}

export function requireEnv(name: SecretName): string {
  const value = process.env[name];
  if (!value) throw new ConfigError(`${name} is not set. Add it to apps/web/.env.local.`);
  return value;
}
