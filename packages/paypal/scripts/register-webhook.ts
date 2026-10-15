// Registers the app's webhook URL with PayPal and prints the id for PAYPAL_WEBHOOK_ID.
// Usage: bun run webhook:register https://your-app.vercel.app/api/webhooks/paypal
import { createPayPalClient, createWebhook, INVOICE_WEBHOOK_EVENTS, PayPalError } from "../src";

const url = process.argv[2];
if (!url?.startsWith("https://")) {
  console.error("Pass the public HTTPS URL of /api/webhooks/paypal (PayPal can't reach localhost).");
  process.exit(1);
}

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_SECRET;
if (!clientId || !clientSecret) {
  console.error("Set PAYPAL_CLIENT_ID and PAYPAL_SECRET in apps/web/.env.local");
  process.exit(1);
}

try {
  const id = await createWebhook(createPayPalClient({ clientId, clientSecret }), url);
  console.log(`Webhook registered for ${INVOICE_WEBHOOK_EVENTS.join(", ")}`);
  console.log(`\nAdd this to apps/web/.env.local (and Vercel):\nPAYPAL_WEBHOOK_ID=${id}`);
} catch (error) {
  if (error instanceof PayPalError) {
    console.error(`PayPal error ${error.status}: ${error.message}`, error.details ?? "");
    process.exit(1);
  }
  throw error;
}
