import { ReminderMessageSchema, type ReminderMessage } from "@repo/shared";
import { generateStructured, type AIClient } from "./client";

export type ReminderTone = "friendly" | "firm" | "urgent" | "final";

/** Tone is decided in code, not by the model, so it is predictable in the demo. */
export function reminderTone(daysOverdue: number): ReminderTone {
  if (daysOverdue <= 3) return "friendly";
  if (daysOverdue <= 14) return "firm";
  if (daysOverdue <= 30) return "urgent";
  return "final";
}

const TONE_GUIDE: Record<ReminderTone, string> = {
  friendly: "Warm and light. Assume it slipped their mind.",
  firm: "Polite but direct. Clearly state the amount and that it is overdue.",
  urgent: "Serious and concise. Ask for payment or a payment date within a few days.",
  final:
    "A final notice. Calm, professional and unambiguous; ask them to pay now or reply with a reason today.",
};

const SYSTEM_PROMPT = `You write short payment reminder messages that a freelancer sends to a client through PayPal.
PayPal attaches the invoice and a payment button automatically, so do not include links.
Only use the facts provided. Do not invent late fees, interest, legal action or deadlines that were not given.
The note should be 2 to 5 sentences, plain text, no placeholders like [Name].`;

export type ReminderInput = {
  clientName: string | null;
  freelancerName?: string;
  invoiceNumber?: string;
  /** Already formatted, e.g. "USD 600.00". */
  amount: string;
  /** ISO date, e.g. "2026-10-01". */
  dueDate: string;
  daysOverdue: number;
};

export async function generateReminder(
  client: AIClient,
  input: ReminderInput,
): Promise<ReminderMessage & { tone: ReminderTone }> {
  const tone = reminderTone(input.daysOverdue);
  const facts = [
    `Client: ${input.clientName ?? "unknown (use a neutral greeting)"}`,
    input.freelancerName && `Freelancer: ${input.freelancerName}`,
    input.invoiceNumber && `Invoice number: ${input.invoiceNumber}`,
    `Amount due: ${input.amount}`,
    `Due date: ${input.dueDate}`,
    input.daysOverdue > 0 ? `Days overdue: ${input.daysOverdue}` : "Not overdue yet",
    `Tone: ${tone}. ${TONE_GUIDE[tone]}`,
  ].filter(Boolean);

  const message = await generateStructured(client, {
    system: SYSTEM_PROMPT,
    content: [{ type: "text", text: facts.join("\n") }],
    schema: ReminderMessageSchema,
    name: "payment_reminder",
  });
  return { ...message, tone };
}
