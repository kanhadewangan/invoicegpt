import { isFullDataSource } from "@notionhq/client";
import { z } from "zod";
import type { NotionClient } from "./client";

export type DataSourceSummary = { id: string; title: string; icon: string | null; url: string };

const plain = (rich: { plain_text: string }[]) => rich.map((t) => t.plain_text).join("").trim();

/** Every database (data source) the user shared with the integration. */
export async function listDataSources(client: NotionClient): Promise<DataSourceSummary[]> {
  const results = [];
  let cursor: string | undefined;
  do {
    const page = await client.search({
      filter: { property: "object", value: "data_source" },
      page_size: 100,
      start_cursor: cursor,
    });
    results.push(...page.results);
    cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return results
    .filter(isFullDataSource)
    .filter((ds) => !ds.in_trash)
    .map((ds) => ({
      id: ds.id,
      title: plain(ds.title) || "Untitled",
      icon: ds.icon?.type === "emoji" ? ds.icon.emoji : null,
      url: ds.url,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export type PropertySummary = {
  id: string;
  name: string;
  type: string;
  /** Option names for status/select properties. */
  options?: string[];
  /** Status groups (To-do / In progress / Complete) with their option names. */
  groups?: { name: string; options: string[] }[];
};

export type DataSourceSchema = { id: string; title: string; url: string; properties: PropertySummary[] };

export async function getDataSourceSchema(client: NotionClient, dataSourceId: string): Promise<DataSourceSchema> {
  const ds = await client.dataSources.retrieve({ data_source_id: dataSourceId });
  if (!isFullDataSource(ds)) throw new Error("Notion returned a partial data source.");
  const properties = Object.values(ds.properties).map((prop): PropertySummary => {
    const base = { id: prop.id, name: prop.name, type: prop.type };
    if (prop.type === "select") return { ...base, options: prop.select.options.map((o) => o.name) };
    if (prop.type === "status") {
      const byId = new Map(prop.status.options.map((o) => [o.id, o.name]));
      return {
        ...base,
        options: prop.status.options.map((o) => o.name),
        groups: prop.status.groups.map((g) => ({
          name: g.name,
          options: g.option_ids.map((id) => byId.get(id)).filter((name): name is string => Boolean(name)),
        })),
      };
    }
    return base;
  });
  return { id: ds.id, title: plain(ds.title) || "Untitled", url: ds.url, properties };
}

// ---------------------------------------------------------------------------------------------
// Mappings: which property means what. Stored by property id, which survives renames.

const statusFields = {
  statusPropertyId: z.string().min(1),
  statusType: z.enum(["status", "select", "checkbox"]),
};

export const TaskMappingSchema = z.object({
  ...statusFields,
  /** Option meaning "finished" (ignored for checkbox: checked = done). */
  doneOption: z.string().nullable(),
  hoursPropertyId: z.string().nullable(),
  ratePropertyId: z.string().nullable(),
  clientPropertyId: z.string().nullable(),
});
export type TaskMapping = z.infer<typeof TaskMappingSchema>;

export const FollowUpMappingSchema = z.object({
  ...statusFields,
  todoOption: z.string().nullable(),
  doneOption: z.string().nullable(),
  datePropertyId: z.string().nullable(),
  urlPropertyId: z.string().nullable(),
});
export type FollowUpMapping = z.infer<typeof FollowUpMappingSchema>;

const NUMERIC = ["number", "formula", "rollup"];
const STATUS_TYPES = ["status", "select", "checkbox"] as const;

function find(props: PropertySummary[], types: string[], name?: RegExp) {
  return props.find((p) => types.includes(p.type) && (!name || name.test(p.name)));
}

function groupOption(prop: PropertySummary | undefined, group: RegExp, fallback: RegExp): string | null {
  if (!prop) return null;
  const fromGroup = prop.groups?.find((g) => group.test(g.name))?.options[0];
  return fromGroup ?? prop.options?.find((o) => fallback.test(o)) ?? null;
}

function guessStatus(props: PropertySummary[]) {
  const prop =
    find(props, ["status"]) ??
    find(props, ["select"], /status|stage|state|progress/i) ??
    find(props, ["checkbox"], /done|complete|finished/i);
  return {
    prop,
    statusPropertyId: prop?.id ?? "",
    statusType: (prop?.type ?? "status") as (typeof STATUS_TYPES)[number],
    doneOption: groupOption(prop, /complete|done/i, /^(done|complete(d)?|finished|shipped)$/i),
  };
}

/** Best guess for a tasks database; the user confirms or changes it in Settings. */
export function guessTaskMapping(schema: DataSourceSchema): TaskMapping {
  const props = schema.properties;
  const { prop: _prop, ...status } = guessStatus(props);
  return {
    ...status,
    hoursPropertyId: find(props, NUMERIC, /hour|hrs|time|estimate|effort|duration/i)?.id ?? null,
    ratePropertyId: find(props, NUMERIC, /rate|price|fee|amount|cost/i)?.id ?? null,
    clientPropertyId:
      find(props, ["select", "multi_select", "rich_text", "relation"], /client|customer|company|account/i)?.id ?? null,
  };
}

export function guessFollowUpMapping(schema: DataSourceSchema): FollowUpMapping {
  const props = schema.properties;
  const { prop, ...status } = guessStatus(props);
  return {
    ...status,
    todoOption: groupOption(prop, /to.?do|not started/i, /^(to.?do|not started|todo|open|backlog)$/i),
    datePropertyId: find(props, ["date"], /due|date|deadline|when/i)?.id ?? find(props, ["date"])?.id ?? null,
    urlPropertyId: find(props, ["url"])?.id ?? null,
  };
}

/** Checks a mapping against the live schema. Returns readable problems (empty = valid). */
export function validateMapping(
  schema: DataSourceSchema,
  mapping: TaskMapping | FollowUpMapping,
  kind: "tasks" | "followUps",
): string[] {
  const problems: string[] = [];
  const byId = new Map(schema.properties.map((p) => [p.id, p]));
  const status = byId.get(mapping.statusPropertyId);
  if (!status || status.type !== mapping.statusType) {
    problems.push("Pick the property that tracks status.");
  } else if (mapping.statusType !== "checkbox") {
    const wanted = kind === "tasks" ? [mapping.doneOption] : [(mapping as FollowUpMapping).todoOption, mapping.doneOption];
    for (const option of wanted) {
      if (!option || !status.options?.includes(option)) problems.push(`"${status.name}" needs both status options chosen.`);
    }
  }
  const optional: [string | null, string[], string][] =
    kind === "tasks"
      ? [
          [(mapping as TaskMapping).hoursPropertyId, NUMERIC, "Hours"],
          [(mapping as TaskMapping).ratePropertyId, NUMERIC, "Rate"],
          [(mapping as TaskMapping).clientPropertyId, ["select", "multi_select", "rich_text", "relation"], "Client"],
        ]
      : [
          [(mapping as FollowUpMapping).datePropertyId, ["date"], "Due date"],
          [(mapping as FollowUpMapping).urlPropertyId, ["url"], "Link"],
        ];
  for (const [id, types, label] of optional) {
    if (id && !types.includes(byId.get(id)?.type ?? "")) problems.push(`${label} must be a ${types.join(" / ")} property.`);
  }
  return [...new Set(problems)];
}
