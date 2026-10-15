import { ReminderMessageSchema } from "@repo/shared";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server/current-user";
import { errorResponse } from "@/lib/server/errors";
import { sendReminder, toInvoiceView } from "@/lib/server/invoices";

/** Sends the reminder the user approved (possibly edited) through PayPal. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const message = ReminderMessageSchema.parse(await request.json());
    const invoice = await sendReminder(await getCurrentUserId(), id, message);
    return NextResponse.json({ invoice: toInvoiceView(invoice) });
  } catch (error) {
    return errorResponse(error);
  }
}
