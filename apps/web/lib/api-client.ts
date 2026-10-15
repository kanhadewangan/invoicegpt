type ErrorBody = {
  error?: string;
  issues?: { path: string; message: string }[];
  savedDraftId?: string;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly issues: { path: string; message: string }[] = [],
    readonly savedDraftId?: string,
  ) {
    super(message);
  }
}

/** POSTs JSON and returns the parsed response, or throws an ApiClientError with a readable message. */
export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError("Couldn't reach the server. Check your connection and try again.");
  }

  const data = (await res.json().catch(() => ({}))) as T & ErrorBody;
  if (!res.ok) {
    throw new ApiClientError(data.error ?? "Something went wrong.", data.issues, data.savedDraftId);
  }
  return data;
}
