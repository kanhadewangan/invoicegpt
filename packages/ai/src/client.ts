import { z } from "zod";

// OpenRouter exposes many models behind one OpenAI-compatible API.
const BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_MODEL = "anthropic/claude-sonnet-5.5";

export type AIClient = { apiKey: string; model: string; timeoutMs: number };

export function createAIClient(options: { apiKey: string; model?: string; timeoutMs?: number }): AIClient {
  return { apiKey: options.apiKey, model: options.model || DEFAULT_MODEL, timeoutMs: options.timeoutMs ?? 45_000 };
}

export class AIError extends Error {
  constructor(
    message: string,
    readonly reason: "refusal" | "invalid_output" | "service_unavailable",
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AIError";
  }
}

/** Provider-neutral message content; converted to OpenRouter's format below. */
export type ContentPart = { type: "text"; text: string } | { type: "image"; mediaType: string; data: string };

function toOpenRouterContent(parts: ContentPart[]) {
  return parts.map((part) =>
    part.type === "text"
      ? { type: "text", text: part.text }
      : { type: "image_url", image_url: { url: `data:${part.mediaType};base64,${part.data}` } },
  );
}

// Validation keywords some providers reject in strict mode. Zod still enforces them after parsing.
const UNSUPPORTED_KEYWORDS = new Set([
  "$schema", "default", "pattern", "format", "minLength", "maxLength",
  "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "minItems", "maxItems",
]);

function stripUnsupported(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(stripUnsupported);
  if (!schema || typeof schema !== "object") return schema;
  return Object.fromEntries(
    Object.entries(schema)
      .filter(([key]) => !UNSUPPORTED_KEYWORDS.has(key))
      .map(([key, value]) => [key, key === "properties" ? mapValues(value, stripUnsupported) : stripUnsupported(value)]),
  );
}

const mapValues = (obj: unknown, fn: (v: unknown) => unknown) =>
  Object.fromEntries(Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, fn(v)]));

type ChatResponse = {
  error?: { message?: string };
  choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[];
};

/** Calls the model, retrying once after a short pause on rate limits and provider outages. */
async function callModel(client: AIClient, body: unknown): Promise<ChatResponse> {
  try {
    return await callModelOnce(client, body);
  } catch (error) {
    if (!(error instanceof RetryableError)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      return await callModelOnce(client, body);
    } catch (retryError) {
      if (retryError instanceof RetryableError) {
        throw new AIError("The AI service is busy right now. Please try again.", "service_unavailable", {
          cause: retryError,
        });
      }
      throw retryError;
    }
  }
}

class RetryableError extends Error {}

async function callModelOnce(client: AIClient, body: unknown): Promise<ChatResponse> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${client.apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "InvoiceGPT",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(client.timeoutMs),
    });
  } catch (error) {
    throw new AIError("The AI service didn't respond. Please try again.", "service_unavailable", { cause: error });
  }

  const data = (await res.json().catch(() => ({}))) as ChatResponse;
  if (res.status === 401 || res.status === 403) {
    throw new AIError("The AI API key was rejected. Check LLM_API_KEY.", "service_unavailable");
  }
  if (res.status === 429 || res.status >= 500) {
    throw new RetryableError(data.error?.message ?? `status ${res.status}`);
  }
  if (res.status === 402) {
    throw new AIError("The AI account is out of credits.", "service_unavailable");
  }
  if (!res.ok || data.error) {
    const detail = data.error?.message ?? `status ${res.status}`;
    throw new AIError(`The AI service returned an error (${detail}).`, "service_unavailable");
  }
  return data;
}

function parseJson(text: string): unknown {
  // Some models wrap JSON in a ```json fence even when asked not to.
  const unfenced = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  return JSON.parse(unfenced);
}

type StructuredRequest<T extends z.ZodType> = {
  system: string;
  content: ContentPart[];
  schema: T;
  /** Name for the JSON schema, shown to the model. */
  name: string;
};

/**
 * Asks the model for JSON matching `schema`, validates it with Zod and retries once if the
 * reply is missing, malformed or fails validation.
 */
export async function generateStructured<T extends z.ZodType>(
  client: AIClient,
  { system, content, schema, name }: StructuredRequest<T>,
): Promise<z.infer<T>> {
  const jsonSchema = stripUnsupported(z.toJSONSchema(schema, { io: "output", target: "draft-7" }));
  const body = {
    model: client.model,
    max_tokens: 4000,
    messages: [
      { role: "system", content: system },
      { role: "user", content: toOpenRouterContent(content) },
    ],
    response_format: { type: "json_schema", json_schema: { name, strict: true, schema: jsonSchema } },
    // Only route to providers that honour response_format.
    provider: { require_parameters: true },
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const choice = (await callModel(client, body)).choices?.[0];
    if (choice?.message?.refusal || choice?.finish_reason === "content_filter") {
      throw new AIError("The AI declined to process this input.", "refusal");
    }
    try {
      const result = schema.safeParse(parseJson(choice?.message?.content ?? ""));
      if (result.success) return result.data;
      lastError = result.error;
    } catch (error) {
      lastError = error;
    }
  }

  throw new AIError("The AI returned an invalid response. Please try again.", "invalid_output", {
    cause: lastError,
  });
}
