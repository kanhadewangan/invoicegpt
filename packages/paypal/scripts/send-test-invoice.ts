// Step 2 smoke test: create and send one hard-coded invoice in the PayPal Sandbox.
// Usage: bun run send:test   (reads apps/web/.env.local)
import { SendableInvoiceSchema } from "@repo/shared";
import { createAndSendInvoice, createPayPalClient, PayPalError, toInvoiceStatus } from "../src";

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_SECRET;
if (!clientId || !clientSecret) {
  console.error("Set PAYPAL_CLIENT_ID and PAYPAL_SECRET in apps/web/.env.local");
  process.exit(1);
}

// Use a Sandbox *personal* account email from developer.paypal.com so you can pay it too.
const recipient = process.env.PAYPAL_TEST_RECIPIENT ?? "client@example.com";

const invoice = SendableInvoiceSchema.parse({
  client_name: "Acme Studio",
  client_email: recipient,
  currency: "USD",
  items: [
    { name: "Landing page design", quantity: 1, unit_price: 450 },
    { name: "Revision round", quantity: 2, unit_price: 75 },
  ],
  due_in_days: 14,
  note: "Thanks for working with me!",
});

const client = createPayPalClient({ clientId, clientSecret, environment: "sandbox" });

try {
  const sent = await createAndSendInvoice(client, invoice);
  console.log("Invoice sent:");
  console.log({
    id: sent.id,
    number: sent.detail.invoice_number,
    paypalStatus: sent.status,
    dashboardStatus: toInvoiceStatus(sent),
    total: sent.amount,
    payLink: sent.detail.metadata?.recipient_view_url,
  });
} catch (error) {
  if (error instanceof PayPalError) {
    console.error(`PayPal error ${error.status}: ${error.message}`);
    console.error({ debugId: error.debugId, details: error.details });
    process.exit(1);
  }
  throw error;
}
