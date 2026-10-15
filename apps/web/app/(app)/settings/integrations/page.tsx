import type { Metadata } from "next";
import type { FollowUpMapping, TaskMapping } from "@repo/notion";
import { NotionSettings, type NotionSetup } from "@/components/settings/notion-settings";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/server/current-user";
import { getNotionConnection, isNotionConfigured } from "@/lib/server/notion";

export const metadata: Metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

const NOTICES: Record<string, { tone: "success" | "error"; text: string }> = {
  connected: { tone: "success", text: "Notion is connected. Pick your databases below." },
  cancelled: { tone: "error", text: "Notion access wasn't granted, so nothing changed." },
  state_mismatch: { tone: "error", text: "That Notion sign-in link expired. Please try connecting again." },
  not_configured: { tone: "error", text: "Notion isn't set up on the server yet (NOTION_CLIENT_ID / SECRET)." },
  error: { tone: "error", text: "Couldn't finish connecting Notion. Please try again." },
};

type Props = { searchParams: Promise<{ notion?: string }> };

export default async function IntegrationsPage({ searchParams }: Props) {
  const user = await requireUser("/settings/integrations");
  const connection = await getNotionConnection(user.id);
  const notice = NOTICES[(await searchParams).notion ?? ""] ?? null;

  // Only what the browser needs: never the (encrypted) tokens.
  const setup: NotionSetup | null = connection && {
    status: connection.status,
    workspaceName: connection.workspaceName,
    workspaceIcon: connection.workspaceIcon,
    tasks: connection.tasksDataSourceId
      ? { dataSourceId: connection.tasksDataSourceId, mapping: connection.tasksMapping as TaskMapping }
      : null,
    followUps: connection.followUpsDataSourceId
      ? { dataSourceId: connection.followUpsDataSourceId, mapping: connection.followUpsMapping as FollowUpMapping }
      : null,
    defaultHourlyRate: connection.defaultHourlyRate ? Number(connection.defaultHourlyRate) : null,
    currency: connection.currency,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Integrations" description="Connect the tools where you plan your work." />
      <NotionSettings configured={isNotionConfigured} setup={setup} notice={notice} />
    </div>
  );
}
