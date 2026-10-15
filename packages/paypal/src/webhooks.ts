import type { PayPalClient } from "./client";

/** Invoice events the app listens to. Each one triggers a re-sync of that invoice's status. */
export const INVOICE_WEBHOOK_EVENTS = [
  "INVOICING.INVOICE.PAID",
  "INVOICING.INVOICE.CANCELLED",
  "INVOICING.INVOICE.REFUNDED",
] as const;

export type WebhookEvent = {
  id: string;
  event_type: string;
  resource?: { id?: string; invoice?: { id?: string } };
};

const SIGNATURE_HEADERS = {
  auth_algo: "paypal-auth-algo",
  cert_url: "paypal-cert-url",
  transmission_id: "paypal-transmission-id",
  transmission_sig: "paypal-transmission-sig",
  transmission_time: "paypal-transmission-time",
} as const;

/**
 * Asks PayPal whether a webhook delivery is genuine. `rawBody` must be the request body
 * exactly as received: it is embedded as-is, because re-serializing parsed JSON can change
 * it and make verification fail.
 */
export async function verifyWebhookSignature(
  client: PayPalClient,
  { headers, rawBody, webhookId }: { headers: Headers; rawBody: string; webhookId: string },
): Promise<boolean> {
  const fields: Record<string, string> = { webhook_id: webhookId };
  for (const [field, header] of Object.entries(SIGNATURE_HEADERS)) {
    const value = headers.get(header);
    if (!value) return false;
    fields[field] = value;
  }

  const prefix = JSON.stringify(fields).slice(0, -1);
  const result = await client.request<{ verification_status: string }>(
    "/v1/notifications/verify-webhook-signature",
    { method: "POST", rawBody: `${prefix},"webhook_event":${rawBody}}` },
  );
  return result.verification_status === "SUCCESS";
}

/** The PayPal invoice id an invoicing event refers to. */
export function invoiceIdFromEvent(event: WebhookEvent): string | null {
  return event.resource?.invoice?.id ?? event.resource?.id ?? null;
}

/** Registers this app's webhook URL with PayPal. Returns the webhook id for PAYPAL_WEBHOOK_ID. */
export async function createWebhook(client: PayPalClient, url: string): Promise<string> {
  const webhook = await client.request<{ id: string }>("/v1/notifications/webhooks", {
    method: "POST",
    body: { url, event_types: INVOICE_WEBHOOK_EVENTS.map((name) => ({ name })) },
  });
  return webhook.id;
}
