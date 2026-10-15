type ErrorBody = {
  error?: string;
  issues?: { path: string; message: string }[];
  savedDraftId?: string;
  code?: string;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly issues: { path: string; message: string }[] = [],
    readonly savedDraftId?: string,
    /** Machine-readable reason, e.g. "notion_reconnect". */
    readonly code?: string,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiClientError("Couldn't reach the server. Check your connection and try again.");
  }

  const data = (await res.json().catch(() => ({}))) as T & ErrorBody;
  if (!res.ok) {
    throw new ApiClientError(data.error ?? "Something went wrong.", data.issues, data.savedDraftId, data.code);
  }
  return data;
}

/** POSTs JSON and returns the parsed response, or throws an ApiClientError with a readable message. */
export function postJson<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function getJson<T>(url: string): Promise<T> {
  return request<T>(url, { method: "GET" });
}
