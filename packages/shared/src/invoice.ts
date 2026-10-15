import { z } from "zod";

export const CurrencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "Use a 3-letter ISO currency code, e.g. USD");

export const LineItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required").max(200),
  quantity: z.number({ error: "Enter a quantity" }).positive("Quantity must be greater than 0"),
  unit_price: z.number({ error: "Enter a price" }).nonnegative("Price cannot be negative"),
});

/** Fields the AI may report as missing; the review screen highlights these. */
export const InvoiceFieldSchema = z.enum([
  "client_name",
  "client_email",
  "currency",
  "items",
  "due_in_days",
  "note",
]);

/**
 * What the AI returns from a messy chat or email. Unknown values are null,
 * never guessed, and are listed in `missing_fields`.
 */
export const ExtractedInvoiceSchema = z.object({
  client_name: z.string().nullable(),
  client_email: z.email().nullable(),
  currency: CurrencyCodeSchema.default("USD"),
  items: z.array(LineItemSchema),
  due_in_days: z.number().int().nonnegative().nullable(),
  note: z.string().nullable(),
  missing_fields: z.array(InvoiceFieldSchema),
});

/**
 * A draft the user has reviewed and that is complete enough to send through PayPal.
 * The review screen validates against this before enabling "Send".
 */
export const SendableInvoiceSchema = z.object({
  client_name: z.string().trim().min(1).nullable(),
  client_email: z.email("A valid client email is required"),
  currency: CurrencyCodeSchema,
  items: z.array(LineItemSchema).min(1, "Add at least one line item"),
  due_in_days: z
    .number({ error: "Enter the number of days until payment is due" })
    .int("Use a whole number of days")
    .min(0, "Days can't be negative")
    .max(365, "Use 365 days or fewer"),
  note: z.string().trim().max(4000).nullable(),
});

/** Status shown on the dashboard (PayPal's statuses are mapped onto these). */
export const InvoiceStatusSchema = z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]);

/** An AI-written payment reminder, sent through PayPal's remind endpoint. */
export const ReminderMessageSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  note: z.string().trim().min(1).max(1500),
});

export type LineItem = z.infer<typeof LineItemSchema>;
export type InvoiceField = z.infer<typeof InvoiceFieldSchema>;
export type ExtractedInvoice = z.infer<typeof ExtractedInvoiceSchema>;
export type SendableInvoice = z.infer<typeof SendableInvoiceSchema>;
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;
export type ReminderMessage = z.infer<typeof ReminderMessageSchema>;

export function lineTotal(item: LineItem): number {
  return Math.round(item.quantity * item.unit_price * 100) / 100;
}

export function invoiceTotal(items: LineItem[]): number {
  return Math.round(items.reduce((sum, item) => sum + lineTotal(item), 0) * 100) / 100;
}

/** ISO date (YYYY-MM-DD, UTC) that is `days` after `today`. */
export function dueDateFromDays(days: number, today = new Date()): string {
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Whole days from `today` until an ISO due date; negative when overdue. */
export function daysUntil(dueDate: string, today = new Date()): number {
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((Date.parse(dueDate) - todayUtc) / 86_400_000);
}
