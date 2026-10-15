import { dueDateFromDays, type SendableInvoice } from "@repo/shared";

// PayPal rejects decimals for these currencies.
const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "HUF", "TWD"]);

export function formatAmount(value: number, currency: string): string {
  return value.toFixed(ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2);
}

/** Converts our invoice into the body for POST /v2/invoicing/invoices. */
export function toPayPalInvoiceRequest(invoice: SendableInvoice, today = new Date()) {
  const { currency } = invoice;

  return {
    detail: {
      currency_code: currency,
      invoice_date: dueDateFromDays(0, today),
      payment_term: { due_date: dueDateFromDays(invoice.due_in_days, today) },
      ...(invoice.note ? { note: invoice.note } : {}),
    },
    primary_recipients: [
      {
        billing_info: {
          email_address: invoice.client_email,
          ...(invoice.client_name ? { name: { full_name: invoice.client_name } } : {}),
        },
      },
    ],
    items: invoice.items.map((item) => ({
      name: item.name,
      quantity: String(item.quantity),
      unit_amount: { currency_code: currency, value: formatAmount(item.unit_price, currency) },
      unit_of_measure: "QUANTITY",
    })),
  };
}
