import "server-only";
import type { Invoice } from "@repo/db";
import { generateReminder } from "@repo/ai";
import {
  createDraftInvoice,
  formatAmount,
  getInvoice,
  remindInvoice,
  sendInvoice,
  toInvoiceStatus,
} from "@repo/paypal";
import {
  daysUntil,
  dueDateFromDays,
  invoiceTotal,
  LineItemSchema,
  type InvoiceStatus,
  type ReminderMessage,
  type SendableInvoice,
} from "@repo/shared";
import { z } from "zod";
import type { InvoiceView } from "../invoice-view";
import { db, getAI, getPayPal } from "./services";

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export function toInvoiceView(row: Invoice, today = new Date()): InvoiceView {
  const dueDate = toIsoDate(row.dueDate);
  const isOverdue = row.status === "SENT" && daysUntil(dueDate, today) < 0;
  return {
    id: row.id,
    status: isOverdue ? "OVERDUE" : row.status,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    currency: row.currency,
    total: row.total.toNumber(),
    dueDate,
    payLink: row.payLink,
    paypalInvoiceNumber: row.paypalInvoiceNumber,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    reminderCount: row.reminderCount,
    lastReminderAt: row.lastReminderAt?.toISOString() ?? null,
  };
}

function toSendable(row: Invoice): SendableInvoice {
  return {
    client_name: row.clientName,
    client_email: row.clientEmail,
    currency: row.currency,
    items: z.array(LineItemSchema).parse(row.items),
    due_in_days: Math.max(0, daysUntil(toIsoDate(row.dueDate))),
    note: row.note,
  };
}

/** Saves the reviewed invoice as a Draft before anything is sent to PayPal. */
export function saveDraft(
  userId: string,
  invoice: SendableInvoice,
  sourceText: string | null,
): Promise<Invoice> {
  return db().invoice.create({
    data: {
      userId,
      clientName: invoice.client_name,
      clientEmail: invoice.client_email,
      currency: invoice.currency,
      items: invoice.items,
      total: invoiceTotal(invoice.items),
      dueDate: new Date(dueDateFromDays(invoice.due_in_days)),
      note: invoice.note,
      sourceText,
    },
  });
}

/**
 * Creates the PayPal invoice (once) and sends it. Safe to call again after a failure:
 * an already-created PayPal draft is reused instead of duplicated.
 */
export async function sendDraft(userId: string, id: string): Promise<Invoice> {
  const row = await db().invoice.findFirstOrThrow({ where: { id, userId } });
  if (row.status !== "DRAFT") return row;

  const paypal = getPayPal();
  let paypalInvoiceId = row.paypalInvoiceId;
  if (!paypalInvoiceId) {
    const draft = await createDraftInvoice(paypal, toSendable(row));
    paypalInvoiceId = draft.id;
    await db().invoice.update({
      where: { id },
      data: { paypalInvoiceId, paypalInvoiceNumber: draft.detail.invoice_number },
    });
  }

  await sendInvoice(paypal, paypalInvoiceId);
  const sent = await getInvoice(paypal, paypalInvoiceId);
  return db().invoice.update({
    where: { id },
    data: {
      status: "SENT",
      paypalInvoiceNumber: sent.detail.invoice_number,
      payLink: sent.detail.metadata?.recipient_view_url ?? null,
    },
  });
}

export async function listInvoices(userId: string): Promise<InvoiceView[]> {
  const rows = await db().invoice.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const today = new Date();
  return rows.map((row) => toInvoiceView(row, today));
}

const STORED_STATUS: Record<InvoiceStatus, Invoice["status"]> = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  OVERDUE: "SENT",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
};

/**
 * Copies PayPal's current status onto our row. PayPal is the source of truth, so this is
 * safe to run any number of times. Returns true if the status changed.
 */
async function syncRow(row: Invoice): Promise<boolean> {
  if (!row.paypalInvoiceId) return false;
  const remote = await getInvoice(getPayPal(), row.paypalInvoiceId);
  const status = STORED_STATUS[toInvoiceStatus(remote)];
  if (status === row.status) return false;
  await db().invoice.update({
    where: { id: row.id },
    data: { status, paidAt: status === "PAID" ? (row.paidAt ?? new Date()) : null },
  });
  return true;
}

/** Pulls the latest status of every unpaid invoice from PayPal. Returns how many changed. */
export async function syncWithPayPal(userId: string): Promise<number> {
  const open = await db().invoice.findMany({
    where: { userId, status: "SENT", paypalInvoiceId: { not: null } },
    take: 50,
  });
  const changes = await Promise.all(open.map(syncRow));
  return changes.filter(Boolean).length;
}

/** Called by the webhook. Unknown invoices (e.g. created outside the app) are ignored. */
export async function syncByPayPalId(paypalInvoiceId: string): Promise<boolean> {
  const row = await db().invoice.findUnique({ where: { paypalInvoiceId } });
  return row ? syncRow(row) : false;
}

/** The invoice is in a state where the requested action makes no sense (e.g. reminding a paid invoice). */
export class InvoiceStateError extends Error {}

async function findRemindable(userId: string, id: string): Promise<Invoice> {
  const row = await db().invoice.findFirstOrThrow({ where: { id, userId } });
  if (row.status !== "SENT" || !row.paypalInvoiceId) {
    throw new InvoiceStateError("Only sent, unpaid invoices can get a reminder.");
  }
  return row;
}

/** Asks the AI for a reminder whose tone matches how overdue the invoice is. Nothing is sent. */
export async function draftReminder(userId: string, id: string) {
  const row = await findRemindable(userId, id);
  const user = await db().user.findUnique({ where: { id: userId } });
  const dueDate = toIsoDate(row.dueDate);
  const total = row.total.toNumber();

  return generateReminder(getAI(), {
    clientName: row.clientName,
    freelancerName: user?.name ?? undefined,
    invoiceNumber: row.paypalInvoiceNumber ?? undefined,
    amount: `${row.currency} ${formatAmount(total, row.currency)}`,
    dueDate,
    daysOverdue: -daysUntil(dueDate),
  });
}

/** Sends the (user-approved) reminder through PayPal and records it. */
export async function sendReminder(userId: string, id: string, message: ReminderMessage): Promise<Invoice> {
  const row = await findRemindable(userId, id);
  await remindInvoice(getPayPal(), row.paypalInvoiceId!, message);
  return db().invoice.update({
    where: { id },
    data: { reminderCount: { increment: 1 }, lastReminderAt: new Date() },
  });
}
