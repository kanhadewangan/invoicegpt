import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server/current-user";
import { errorResponse } from "@/lib/server/errors";
import { sendDraft, toInvoiceView } from "@/lib/server/invoices";

/** Retries sending a draft whose earlier send failed. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sent = await sendDraft(await getCurrentUserId(), id);
    return NextResponse.json({ invoice: toInvoiceView(sent) });
  } catch (error) {
    return errorResponse(error);
  }
}
