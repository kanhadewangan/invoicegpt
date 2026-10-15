"use client";

import type { DataSourceSchema, DataSourceSummary, FollowUpMapping, PropertySummary, TaskMapping } from "@repo/notion";
import { BellRing, Check, CircleAlert, ExternalLink, ListChecks, RefreshCw, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ApiClientError, getJson, postJson } from "@/lib/api-client";
import { Alert, Button, Card, buttonClass, fieldClass, Pill, Spinner } from "../ui";

export type NotionSetup = {
  status: "ACTIVE" | "NEEDS_RECONNECT";
  workspaceName: string | null;
  workspaceIcon: string | null;
  tasks: { dataSourceId: string; mapping: TaskMapping } | null;
  followUps: { dataSourceId: string; mapping: FollowUpMapping } | null;
  defaultHourlyRate: number | null;
  currency: string;
};

type Notice = { tone: "success" | "error"; text: string } | null;
type SchemaResponse = { schema: DataSourceSchema; guess: { tasks: TaskMapping; followUps: FollowUpMapping } };

const CONNECT_URL = "/api/notion/connect";
const STATUS_TYPES = ["status", "select", "checkbox"];
const NUMERIC = ["number", "formula", "rollup"];
const CLIENT_TYPES = ["select", "multi_select", "rich_text", "relation"];

function NotionMark({ className = "size-10" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`${className} grid shrink-0 place-items-center rounded-xl border border-line bg-surface font-serif text-lg font-bold text-fg shadow-card`}
    >
      N
    </span>
  );
}

function WorkspaceIcon({ icon }: { icon: string | null }) {
  if (icon?.startsWith("http")) {
    // eslint-disable-next-line @next/next/no-img-element -- workspace icon hosted by Notion
    return <img src={icon} alt="" className="size-5 rounded" />;
  }
  return <span className="text-base leading-none">{icon || "🗂️"}</span>;
}

// ---------------------------------------------------------------------------------------------
// Small form helpers

function SelectField(props: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-medium text-muted">
        {props.label}
        {props.hint && <span className="text-xs font-normal text-faint">{props.hint}</span>}
      </span>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value)} className={fieldClass()}>
        {props.placeholder !== undefined && <option value="">{props.placeholder}</option>}
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const propertyOptions = (schema: DataSourceSchema, types: string[]) =>
  schema.properties
    .filter((p) => types.includes(p.type))
    .map((p) => ({ value: p.id, label: `${p.name} · ${p.type.replace("_", " ")}` }));

const optionList = (prop: PropertySummary | undefined) => (prop?.options ?? []).map((o) => ({ value: o, label: o }));

/** Loads a database's schema, keeping the saved mapping if it's the saved database. */
function useSchema(dataSourceId: string) {
  const [state, setState] = useState<{ id: string; data: SchemaResponse | null; error: string | null }>({
    id: "",
    data: null,
    error: null,
  });
  useEffect(() => {
    if (!dataSourceId) return;
    let cancelled = false;
    getJson<SchemaResponse>(`/api/notion/data-sources/${dataSourceId}`)
      .then((data) => !cancelled && setState({ id: dataSourceId, data, error: null }))
      .catch(
        (err) =>
          !cancelled &&
          setState({ id: dataSourceId, data: null, error: err instanceof ApiClientError ? err.message : "Couldn't load it." }),
      );
    return () => {
      cancelled = true;
    };
  }, [dataSourceId]);
  const loading = Boolean(dataSourceId) && state.id !== dataSourceId;
  return { loading, data: state.id === dataSourceId ? state.data : null, error: state.id === dataSourceId ? state.error : null };
}

// ---------------------------------------------------------------------------------------------
// Database sections

function SectionShell(props: {
  icon: ReactNode;
  title: string;
  description: string;
  dataSources: DataSourceSummary[];
  dataSourceId: string;
  onDataSource: (id: string) => void;
  children?: ReactNode;
  loading: boolean;
  error: string | null;
}) {
  const selected = props.dataSources.find((d) => d.id === props.dataSourceId);
  return (
    <div className="rounded-xl border border-line p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-text [&>svg]:size-4">
          {props.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{props.title}</h3>
          <p className="mt-0.5 text-sm text-muted">{props.description}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <SelectField
          label="Database"
          value={props.dataSourceId}
          onChange={props.onDataSource}
          placeholder="Not used"
          options={props.dataSources.map((d) => ({ value: d.id, label: `${d.icon ? `${d.icon} ` : ""}${d.title}` }))}
        />
        {selected && (
          <a href={selected.url} target="_blank" rel="noreferrer" className={buttonClass({ variant: "ghost", size: "md" })}>
            Open <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
      {props.loading && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Spinner /> Reading the database…
        </p>
      )}
      {props.error && (
        <div className="mt-4">
          <Alert title="Couldn't read that database">{props.error}</Alert>
        </div>
      )}
      {props.children && <div className="animate-enter mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">{props.children}</div>}
    </div>
  );
}

function TasksSection(props: {
  dataSources: DataSourceSummary[];
  value: { dataSourceId: string; mapping: TaskMapping | null };
  onChange: (value: { dataSourceId: string; mapping: TaskMapping | null }) => void;
}) {
  const { dataSourceId, mapping } = props.value;
  const { loading, data, error } = useSchema(dataSourceId);

  // A freshly picked database starts from our guess.
  useEffect(() => {
    if (data && !mapping) props.onChange({ dataSourceId, mapping: data.guess.tasks });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const set = (patch: Partial<TaskMapping>) => mapping && props.onChange({ dataSourceId, mapping: { ...mapping, ...patch } });
  const status = data?.schema.properties.find((p) => p.id === mapping?.statusPropertyId);

  return (
    <SectionShell
      icon={<ListChecks />}
      title="Bill finished tasks"
      description="Tasks you mark done show up on your dashboard, ready to turn into an invoice."
      dataSources={props.dataSources}
      dataSourceId={dataSourceId}
      onDataSource={(id) => props.onChange({ dataSourceId: id, mapping: null })}
      loading={loading}
      error={error}
    >
      {data && mapping && (
        <>
          <SelectField
            label="Status property"
            value={mapping.statusPropertyId}
            placeholder="Choose…"
            options={propertyOptions(data.schema, STATUS_TYPES)}
            onChange={(id) => {
              const prop = data.schema.properties.find((p) => p.id === id);
              set({ statusPropertyId: id, statusType: (prop?.type ?? "status") as TaskMapping["statusType"], doneOption: null });
            }}
          />
          {mapping.statusType === "checkbox" ? (
            <p className="self-end pb-2.5 text-sm text-muted">Checked means done.</p>
          ) : (
            <SelectField
              label="Counts as done"
              value={mapping.doneOption ?? ""}
              placeholder="Choose…"
              options={optionList(status)}
              onChange={(v) => set({ doneOption: v || null })}
            />
          )}
          <SelectField
            label="Hours"
            hint="optional"
            value={mapping.hoursPropertyId ?? ""}
            placeholder="None: bill each task once"
            options={propertyOptions(data.schema, NUMERIC)}
            onChange={(v) => set({ hoursPropertyId: v || null })}
          />
          <SelectField
            label="Rate or price"
            hint="optional"
            value={mapping.ratePropertyId ?? ""}
            placeholder="None: use default rate"
            options={propertyOptions(data.schema, NUMERIC)}
            onChange={(v) => set({ ratePropertyId: v || null })}
          />
          <SelectField
            label="Client"
            hint="optional, groups tasks"
            value={mapping.clientPropertyId ?? ""}
            placeholder="None"
            options={propertyOptions(data.schema, CLIENT_TYPES)}
            onChange={(v) => set({ clientPropertyId: v || null })}
          />
        </>
      )}
    </SectionShell>
  );
}

function FollowUpsSection(props: {
  dataSources: DataSourceSummary[];
  value: { dataSourceId: string; mapping: FollowUpMapping | null };
  onChange: (value: { dataSourceId: string; mapping: FollowUpMapping | null }) => void;
}) {
  const { dataSourceId, mapping } = props.value;
  const { loading, data, error } = useSchema(dataSourceId);

  useEffect(() => {
    if (data && !mapping) props.onChange({ dataSourceId, mapping: data.guess.followUps });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const set = (patch: Partial<FollowUpMapping>) =>
    mapping && props.onChange({ dataSourceId, mapping: { ...mapping, ...patch } });
  const status = data?.schema.properties.find((p) => p.id === mapping?.statusPropertyId);

  return (
    <SectionShell
      icon={<BellRing />}
      title="Overdue follow-ups"
      description="When an invoice goes overdue, we add a follow-up task here, and tick it off once it's paid."
      dataSources={props.dataSources}
      dataSourceId={dataSourceId}
      onDataSource={(id) => props.onChange({ dataSourceId: id, mapping: null })}
      loading={loading}
      error={error}
    >
      {data && mapping && (
        <>
          <SelectField
            label="Status property"
            value={mapping.statusPropertyId}
            placeholder="Choose…"
            options={propertyOptions(data.schema, STATUS_TYPES)}
            onChange={(id) => {
              const prop = data.schema.properties.find((p) => p.id === id);
              set({
                statusPropertyId: id,
                statusType: (prop?.type ?? "status") as FollowUpMapping["statusType"],
                todoOption: null,
                doneOption: null,
              });
            }}
          />
          {mapping.statusType === "checkbox" ? (
            <p className="self-end pb-2.5 text-sm text-muted">New tasks start unchecked and get checked when paid.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="New task"
                value={mapping.todoOption ?? ""}
                placeholder="Choose…"
                options={optionList(status)}
                onChange={(v) => set({ todoOption: v || null })}
              />
              <SelectField
                label="When paid"
                value={mapping.doneOption ?? ""}
                placeholder="Choose…"
                options={optionList(status)}
                onChange={(v) => set({ doneOption: v || null })}
              />
            </div>
          )}
          <SelectField
            label="Due date"
            hint="optional"
            value={mapping.datePropertyId ?? ""}
            placeholder="None"
            options={propertyOptions(data.schema, ["date"])}
            onChange={(v) => set({ datePropertyId: v || null })}
          />
          <SelectField
            label="Invoice link"
            hint="optional"
            value={mapping.urlPropertyId ?? ""}
            placeholder="None"
            options={propertyOptions(data.schema, ["url"])}
            onChange={(v) => set({ urlPropertyId: v || null })}
          />
        </>
      )}
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------------------------

function ConnectCard({ configured }: { configured: boolean }) {
  return (
    <Card>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <NotionMark className="size-12" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Notion</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Plan your work in Notion and let InvoiceGPT do the billing: finished tasks become invoice line items, and
            overdue invoices become follow-up tasks in your planner.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {[
              "You choose exactly which pages and databases to share",
              "We only read and update the databases you pick here",
              "Disconnect any time",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 text-success" />
                {item}
              </li>
            ))}
          </ul>
          {configured ? (
            <a href={CONNECT_URL} className={`${buttonClass()} mt-5`}>
              Connect Notion
            </a>
          ) : (
            <div className="mt-5">
              <Alert title="Notion isn't set up on the server yet">
                Add NOTION_CLIENT_ID and NOTION_CLIENT_SECRET to apps/web/.env.local, then restart the dev server.
              </Alert>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function NotionSettings({ configured, setup, notice }: { configured: boolean; setup: NotionSetup | null; notice: Notice }) {
  const router = useRouter();
  const [dataSources, setDataSources] = useState<DataSourceSummary[] | null>(null);
  const [listError, setListError] = useState<{ message: string; reconnect: boolean } | null>(null);
  const [tasks, setTasks] = useState({ dataSourceId: setup?.tasks?.dataSourceId ?? "", mapping: setup?.tasks?.mapping ?? null });
  const [followUps, setFollowUps] = useState({
    dataSourceId: setup?.followUps?.dataSourceId ?? "",
    mapping: setup?.followUps?.mapping ?? null,
  });
  const [rate, setRate] = useState(setup?.defaultHourlyRate?.toString() ?? "");
  const [currency, setCurrency] = useState(setup?.currency ?? "USD");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const active = setup?.status === "ACTIVE";

  useEffect(() => {
    if (!active) return;
    getJson<{ dataSources: DataSourceSummary[] }>("/api/notion/data-sources")
      .then((res) => setDataSources(res.dataSources))
      .catch((err) =>
        setListError({
          message: err instanceof ApiClientError ? err.message : "Couldn't load your Notion databases.",
          reconnect: err instanceof ApiClientError && err.code === "notion_reconnect",
        }),
      );
  }, [active]);

  async function save() {
    setSaving(true);
    setSaveResult(null);
    try {
      await postJson("/api/notion/settings", {
        tasks: tasks.dataSourceId && tasks.mapping ? tasks : null,
        followUps: followUps.dataSourceId && followUps.mapping ? followUps : null,
        defaultHourlyRate: rate.trim() ? Number(rate) : null,
        currency,
      });
      setSaveResult({ ok: true, text: "Saved." });
      router.refresh();
    } catch (err) {
      setSaveResult({ ok: false, text: err instanceof ApiClientError ? err.message : "Couldn't save." });
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Notion? Your Notion pages stay as they are.")) return;
    setDisconnecting(true);
    try {
      await postJson("/api/notion/disconnect");
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  const banner = notice && (
    <div
      role="status"
      className={`animate-enter flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
        notice.tone === "success"
          ? "border-success/25 bg-success-soft text-success"
          : "border-danger/25 bg-danger-soft text-danger"
      }`}
    >
      {notice.tone === "success" ? <Check className="size-4" /> : <CircleAlert className="size-4" />}
      {notice.text}
    </div>
  );

  if (!setup) {
    return (
      <div className="space-y-4">
        {banner}
        <ConnectCard configured={configured} />
      </div>
    );
  }

  const needsReconnect = !active || listError?.reconnect;

  return (
    <div className="space-y-4">
      {banner}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <NotionMark />
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                Notion
                {needsReconnect ? <Pill>Needs reconnecting</Pill> : <Pill tone="brand">Connected</Pill>}
              </h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                <WorkspaceIcon icon={setup.workspaceIcon} />
                {setup.workspaceName ?? "Notion workspace"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={CONNECT_URL} className={buttonClass({ variant: needsReconnect ? "primary" : "secondary" })}>
              <RefreshCw className="size-4" />
              {needsReconnect ? "Reconnect" : "Share more pages"}
            </a>
            <Button variant="ghost" onClick={disconnect} loading={disconnecting}>
              {!disconnecting && <Unplug className="size-4" />}
              Disconnect
            </Button>
          </div>
        </div>

        {needsReconnect ? (
          <div className="mt-5">
            <Alert title="Notion access expired">
              Notion stopped accepting our access (it may have been removed in Notion). Reconnect to keep syncing.
            </Alert>
          </div>
        ) : listError ? (
          <div className="mt-5">
            <Alert title="Couldn't load your databases">{listError.message}</Alert>
          </div>
        ) : !dataSources ? (
          <div className="mt-6 space-y-3" aria-label="Loading Notion databases">
            <div className="animate-shimmer h-28 rounded-xl" />
            <div className="animate-shimmer h-28 rounded-xl" />
          </div>
        ) : dataSources.length === 0 ? (
          <div className="mt-5">
            <Alert title="No databases shared yet">
              Click &ldquo;Share more pages&rdquo; and select your tasks database (and one for follow-ups) in Notion.
            </Alert>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <TasksSection dataSources={dataSources} value={tasks} onChange={setTasks} />
            <div className="grid gap-4 rounded-xl border border-line p-4 sm:grid-cols-2 sm:p-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-muted">Default hourly rate</span>
                <input
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 50"
                  className={fieldClass()}
                />
                <span className="mt-1 block text-xs text-faint">Used when a task has no rate of its own.</span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-muted">Currency</span>
                <input
                  value={currency}
                  maxLength={3}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  className={fieldClass()}
                />
              </label>
            </div>
            <FollowUpsSection dataSources={dataSources} value={followUps} onChange={setFollowUps} />

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
              {saveResult && (
                <span role="status" className={`animate-fade-in text-sm ${saveResult.ok ? "text-success" : "text-danger"}`}>
                  {saveResult.text}
                </span>
              )}
              <Button onClick={save} loading={saving}>
                Save settings
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
