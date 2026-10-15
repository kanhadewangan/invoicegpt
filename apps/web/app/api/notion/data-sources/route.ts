import { listDataSources } from "@repo/notion";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server/current-user";
import { errorResponse } from "@/lib/server/errors";
import { withNotion } from "@/lib/server/notion";

/** Databases the user shared with InvoiceGPT. */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    return NextResponse.json({ dataSources: await withNotion(userId, (client) => listDataSources(client)) });
  } catch (error) {
    return errorResponse(error);
  }
}
