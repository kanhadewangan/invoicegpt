import { revokeNotionToken } from "@repo/notion";
import { NextResponse } from "next/server";
import { decryptSecret } from "@/lib/server/crypto";
import { getCurrentUserId } from "@/lib/server/current-user";
import { errorResponse } from "@/lib/server/errors";
import { getNotionConnection, notionOAuthConfig } from "@/lib/server/notion";
import { db } from "@/lib/server/services";

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    const connection = await getNotionConnection(userId);
    if (connection) {
      await db().notionConnection.delete({ where: { userId } });
      // After deleting, so a revoke failure can never leave the user stuck connected.
      await revokeNotionToken(notionOAuthConfig(), decryptSecret(connection.accessToken)).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
