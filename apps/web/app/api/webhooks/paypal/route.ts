import { invoiceIdFromEvent, verifyWebhookSignature, type WebhookEvent } from "@repo/paypal";
import { NextResponse } from "next/server";
import { requireEnv } from "@/lib/server/env";
import { isDatabaseUnreachable } from "@/lib/server/errors";
import { syncByPayPalId } from "@/lib/server/invoices";
import { getPayPal } from "@/lib/server/services";

/**
 * PayPal calls this when an invoice is paid, cancelled or refunded.
 * We verify the signature, then re-read the invoice from PayPal instead of trusting the payload.
 * Any non-2xx response makes PayPal retry the delivery later.
 */
export async function POST(request: Request) {
  if (!request.headers.get("paypal-transmission-sig")) {
    return NextResponse.json({ error: "Missing PayPal signature" }, { status: 400 });
  }
  const rawBody = await request.text();

  try {
    const verified = await verifyWebhookSignature(getPayPal(), {
      headers: request.headers,
      rawBody,
      webhookId: requireEnv("PAYPAL_WEBHOOK_ID"),
    });
    if (!verified) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody) as WebhookEvent;
    const paypalInvoiceId = event.event_type.startsWith("INVOICING.INVOICE.") ? invoiceIdFromEvent(event) : null;
    const updated = paypalInvoiceId ? await syncByPayPalId(paypalInvoiceId) : false;

    console.info(`PayPal webhook ${event.event_type} (${event.id}): ${updated ? "status updated" : "no change"}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayPal webhook failed", error);
    // 503 asks PayPal to retry; that's right for outages, harmless otherwise.
    const status = isDatabaseUnreachable(error) ? 503 : 500;
    return NextResponse.json({ error: "Webhook processing failed" }, { status });
  }
}
