import { getDataSourceSchema, guessFollowUpMapping, guessTaskMapping } from "@repo/notion";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server/current-user";
import { errorResponse } from "@/lib/server/errors";
import { withNotion } from "@/lib/server/notion";

/** A database's properties plus our best guess at the mapping, for the settings form. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    const { id } = await params;
    const schema = await withNotion(userId, (client) => getDataSourceSchema(client, id));
    return NextResponse.json({
      schema,
      guess: { tasks: guessTaskMapping(schema), followUps: guessFollowUpMapping(schema) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
