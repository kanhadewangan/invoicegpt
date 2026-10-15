import { toPayPalError } from "./errors";

const BASE_URLS = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
} as const;

// Refresh the token a minute early so it never expires mid-request.
const TOKEN_EXPIRY_MARGIN_MS = 60_000;

export type PayPalConfig = {
  clientId: string;
  clientSecret: string;
  environment?: keyof typeof BASE_URLS;
  timeoutMs?: number;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Already-serialized JSON, sent byte-for-byte (used for webhook verification). */
  rawBody?: string;
  headers?: Record<string, string>;
};

export type PayPalClient = {
  request<T>(path: string, options?: RequestOptions): Promise<T>;
};

export function createPayPalClient(config: PayPalConfig): PayPalClient {
  const baseUrl = BASE_URLS[config.environment ?? "sandbox"];
  const timeoutMs = config.timeoutMs ?? 15_000;

  let cachedToken: { value: string; expiresAt: number } | null = null;
  let pendingToken: Promise<string> | null = null;

  async function fetchToken(): Promise<string> {
    const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw await toPayPalError(res);

    const data = (await res.json()) as { access_token: string; expires_in: number };
    cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000 - TOKEN_EXPIRY_MARGIN_MS,
    };
    return data.access_token;
  }

  function getToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
      return Promise.resolve(cachedToken.value);
    }
    // Share one in-flight token request between concurrent callers.
    pendingToken ??= fetchToken().finally(() => {
      pendingToken = null;
    });
    return pendingToken;
  }

  async function send(path: string, options: RequestOptions): Promise<Response> {
    const token = await getToken();
    return fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
      signal: AbortSignal.timeout(timeoutMs),
    });
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    let res = await send(path, options);
    if (res.status === 401) {
      // Token was revoked or expired early: drop it and retry once.
      cachedToken = null;
      res = await send(path, options);
    }
    if (!res.ok) throw await toPayPalError(res);

    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  return { request };
}
