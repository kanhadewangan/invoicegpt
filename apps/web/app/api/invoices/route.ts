import { SendableInvoiceSchema } from "@repo/shared";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/server/current-user";
import { errorResponse } from "@/lib/server/errors";
import { saveDraft, sendDraft, toInvoiceView } from "@/lib/server/invoices";

const BodySchema = z.object({
  invoice: SendableInvoiceSchema,
  sourceText: z.string().max(20_000).nullable().default(null),
});

/** Saves the reviewed invoice, then creates and sends it through PayPal. */
export async function POST(request: Request) {
  let draftId: string | undefined;
  try {
    const { invoice, sourceText } = BodySchema.parse(await request.json());
    const userId = await getCurrentUserId();
    draftId = (await saveDraft(userId, invoice, sourceText)).id;
    const sent = await sendDraft(userId, draftId);
    return NextResponse.json({ invoice: toInvoiceView(sent) });
  } catch (error) {
    // If saving worked but PayPal failed, the draft can be retried from the dashboard.
    return errorResponse(error, draftId ? { savedDraftId: draftId } : {});
  }
}
