import type { InvoiceStatus, SendableInvoice } from "@repo/shared";
import type { PayPalClient } from "./client";
import { toPayPalInvoiceRequest } from "./mapper";

const INVOICES_PATH = "/v2/invoicing/invoices";

/** The subset of PayPal's invoice object that the app uses. */
export type PayPalInvoice = {
  id: string;
  status: string;
  detail: {
    invoice_number?: string;
    invoice_date?: string;
    currency_code: string;
    note?: string;
    payment_term?: { due_date?: string };
    metadata?: { recipient_view_url?: string; invoicer_view_url?: string };
  };
  primary_recipients?: {
    billing_info?: { email_address?: string; name?: { full_name?: string } };
  }[];
  amount?: { currency_code: string; value: string };
  due_amount?: { currency_code: string; value: string };
};

type InvoiceList = { items?: PayPalInvoice[]; total_items?: number; total_pages?: number };

export function createDraftInvoice(client: PayPalClient, invoice: SendableInvoice) {
  return client.request<PayPalInvoice>(INVOICES_PATH, {
    method: "POST",
    body: toPayPalInvoiceRequest(invoice),
    // Return the full invoice (including its id) instead of just a link.
    headers: { Prefer: "return=representation" },
  });
}

export async function sendInvoice(client: PayPalClient, invoiceId: string) {
  await client.request(`${INVOICES_PATH}/${encodeURIComponent(invoiceId)}/send`, {
    method: "POST",
    body: { send_to_invoicer: false, send_to_recipient: true },
  });
}

/** Creates the draft, sends it, and returns the invoice as PayPal now sees it. */
export async function createAndSendInvoice(client: PayPalClient, invoice: SendableInvoice) {
  const draft = await createDraftInvoice(client, invoice);
  await sendInvoice(client, draft.id);
  return getInvoice(client, draft.id);
}

export function getInvoice(client: PayPalClient, invoiceId: string) {
  return client.request<PayPalInvoice>(`${INVOICES_PATH}/${encodeURIComponent(invoiceId)}`);
}

export async function listInvoices(client: PayPalClient, page = 1, pageSize = 20) {
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    total_required: "true",
  });
  const list = await client.request<InvoiceList>(`${INVOICES_PATH}?${query}`);
  return { invoices: list.items ?? [], total: list.total_items ?? 0 };
}

export async function remindInvoice(
  client: PayPalClient,
  invoiceId: string,
  message: { subject: string; note: string },
) {
  await client.request(`${INVOICES_PATH}/${encodeURIComponent(invoiceId)}/remind`, {
    method: "POST",
    body: { ...message, send_to_invoicer: false, send_to_recipient: true },
  });
}

/** Maps PayPal's many statuses onto the dashboard's. "Overdue" is derived from the due date. */
export function toInvoiceStatus(invoice: PayPalInvoice, today = new Date()): InvoiceStatus {
  switch (invoice.status) {
    case "DRAFT":
    case "SCHEDULED":
      return "DRAFT";
    case "PAID":
    case "MARKED_AS_PAID":
      return "PAID";
    case "CANCELLED":
    case "REFUNDED":
    case "MARKED_AS_REFUNDED":
      return "CANCELLED";
  }
  const dueDate = invoice.detail.payment_term?.due_date;
  const todayIso = today.toISOString().slice(0, 10);
  return dueDate && dueDate < todayIso ? "OVERDUE" : "SENT";
}
