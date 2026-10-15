import { Prisma } from "@repo/db";
import { FollowUpMappingSchema, getDataSourceSchema, TaskMappingSchema, validateMapping } from "@repo/notion";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/server/current-user";
import { errorResponse } from "@/lib/server/errors";
import { withNotion } from "@/lib/server/notion";
import { db } from "@/lib/server/services";

const BodySchema = z.object({
  tasks: z.object({ dataSourceId: z.string().min(1), mapping: TaskMappingSchema }).nullable(),
  followUps: z.object({ dataSourceId: z.string().min(1), mapping: FollowUpMappingSchema }).nullable(),
  defaultHourlyRate: z.number().positive().max(1_000_000).nullable(),
  currency: z.string().length(3).toUpperCase(),
});

/** Saves which databases to use and what their properties mean, after checking them live. */
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = BodySchema.parse(await request.json());

    const problems = await withNotion(userId, async (client) => {
      const found: string[] = [];
      if (body.tasks) {
        const schema = await getDataSourceSchema(client, body.tasks.dataSourceId);
        found.push(...validateMapping(schema, body.tasks.mapping, "tasks").map((p) => `Tasks: ${p}`));
      }
      if (body.followUps) {
        const schema = await getDataSourceSchema(client, body.followUps.dataSourceId);
        found.push(...validateMapping(schema, body.followUps.mapping, "followUps").map((p) => `Follow-ups: ${p}`));
      }
      return found;
    });
    if (problems.length) return NextResponse.json({ error: problems.join(" ") }, { status: 400 });

    await db().notionConnection.update({
      where: { userId },
      data: {
        tasksDataSourceId: body.tasks?.dataSourceId ?? null,
        tasksMapping: body.tasks?.mapping ?? Prisma.DbNull,
        followUpsDataSourceId: body.followUps?.dataSourceId ?? null,
        followUpsMapping: body.followUps?.mapping ?? Prisma.DbNull,
        defaultHourlyRate: body.defaultHourlyRate,
        currency: body.currency,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
