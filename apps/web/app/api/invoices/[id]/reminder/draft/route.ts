import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server/current-user";
import { errorResponse } from "@/lib/server/errors";
import { draftReminder } from "@/lib/server/invoices";

export const maxDuration = 60;

/** Drafts an AI reminder for the user to review. Nothing is sent. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json(await draftReminder(await getCurrentUserId(), id));
  } catch (error) {
    return errorResponse(error);
  }
}
