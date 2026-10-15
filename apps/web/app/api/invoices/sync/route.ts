import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server/current-user";
import { errorResponse } from "@/lib/server/errors";
import { syncWithPayPal } from "@/lib/server/invoices";

/** Refreshes statuses from PayPal (the webhook in step 5 will make this automatic). */
export async function POST() {
  try {
    const updated = await syncWithPayPal(await getCurrentUserId());
    return NextResponse.json({ updated });
  } catch (error) {
    return errorResponse(error);
  }
}
