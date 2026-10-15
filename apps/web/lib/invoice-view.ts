import type { InvoiceStatus } from "@repo/shared";

/** An invoice as the browser sees it: plain JSON, with Overdue already worked out. */
export type InvoiceView = {
  id: string;
  status: InvoiceStatus;
  clientName: string | null;
  clientEmail: string;
  currency: string;
  total: number;
  dueDate: string;
  payLink: string | null;
  paypalInvoiceNumber: string | null;
  createdAt: string;
  paidAt: string | null;
  reminderCount: number;
  lastReminderAt: string | null;
};

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
