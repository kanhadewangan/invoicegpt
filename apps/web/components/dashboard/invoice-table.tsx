"use client";

import { daysUntil, type InvoiceStatus } from "@repo/shared";
import { BellRing, ExternalLink, FilePlus2, Inbox, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError, postJson } from "@/lib/api-client";
import { formatMoney, type InvoiceView } from "@/lib/invoice-view";
import { Button, ButtonLink, StatusBadge, stagger } from "../ui";
import { ReminderDialog } from "./reminder-dialog";

const FILTERS: { id: string; label: string; statuses: InvoiceStatus[] | null }[] = [
  { id: "all", label: "All", statuses: null },
  { id: "open", label: "Awaiting", statuses: ["SENT", "OVERDUE"] },
  { id: "overdue", label: "Overdue", statuses: ["OVERDUE"] },
  { id: "paid", label: "Paid", statuses: ["PAID"] },
  { id: "draft", label: "Drafts", statuses: ["DRAFT"] },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function dueHint(invoice: InvoiceView): { text: string; urgent: boolean } | null {
  if (invoice.status === "PAID" && invoice.paidAt) return { text: `Paid ${formatDate(invoice.paidAt)}`, urgent: false };
  if (invoice.status !== "SENT" && invoice.status !== "OVERDUE") return null;
  const days = daysUntil(invoice.dueDate);
  if (days < 0) return { text: `${-days} day${days === -1 ? "" : "s"} overdue`, urgent: true };
  if (days === 0) return { text: "Due today", urgent: true };
  return { text: `Due in ${days} day${days === 1 ? "" : "s"}`, urgent: false };
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-text">
      {initials || "?"}
    </span>
  );
}

function RetrySend({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setLoading(true);
    setError(null);
    try {
      await postJson(`/api/invoices/${id}/send`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Send failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" size="sm" onClick={retry} loading={loading} className="group/retry">
        {!loading && (
          <RotateCw className="size-3.5 transition-transform duration-400 ease-standard group-hover/retry:rotate-180" />
        )}
        Retry send
      </Button>
      {error && <span className="animate-fade-in max-w-60 text-right text-xs text-danger">{error}</span>}
    </div>
  );
}

function Actions({ invoice, onRemind }: { invoice: InvoiceView; onRemind: () => void }) {
  if (invoice.status === "DRAFT") return <RetrySend id={invoice.id} />;
  return (
    <div className="flex items-center justify-end gap-1.5">
      {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
        <Button
          variant={invoice.status === "OVERDUE" ? "primary" : "secondary"}
          size="sm"
          onClick={onRemind}
          className="group/remind"
        >
          <BellRing className="size-3.5 origin-top group-hover/remind:animate-[shake_400ms_ease-in-out]" />
          Remind
        </Button>
      )}
      {invoice.payLink && (
        <a
          href={invoice.payLink}
          target="_blank"
          rel="noreferrer"
          title="Open the client's invoice"
          aria-label="Open the client's invoice"
          className="grid size-8 place-items-center rounded-lg text-faint transition hover:bg-subtle hover:text-fg"
        >
          <ExternalLink className="size-4" />
        </a>
      )}
    </div>
  );
}

function ClientCell({ invoice }: { invoice: InvoiceView }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={invoice.clientName ?? invoice.clientEmail} />
      <div className="min-w-0">
        <p className="truncate font-medium">{invoice.clientName ?? invoice.clientEmail}</p>
        <p className="truncate text-xs text-faint">
          {invoice.clientName ? invoice.clientEmail : null}
          {invoice.paypalInvoiceNumber && (
            <>
              {invoice.clientName ? " · " : ""}#{invoice.paypalInvoiceNumber}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="animate-enter flex flex-col items-center px-6 py-16 text-center">
      <span className="animate-pop grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-text">
        <Inbox className="size-6" />
      </span>
      <p className="mt-4 font-semibold">{filtered ? "Nothing here" : "No invoices yet"}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">
        {filtered
          ? "No invoices match this filter."
          : "Paste a client chat and you'll have your first invoice out in under a minute."}
      </p>
      {!filtered && (
        <ButtonLink href="/new" className="mt-5">
          <FilePlus2 className="size-4" />
          Create your first invoice
        </ButtonLink>
      )}
    </div>
  );
}

export function InvoiceTable({ invoices }: { invoices: InvoiceView[] }) {
  const [remindFor, setRemindFor] = useState<InvoiceView | null>(null);
  const [filterId, setFilterId] = useState("all");
  const filter = FILTERS.find((f) => f.id === filterId) ?? FILTERS[0]!;
  const matches = (f: (typeof FILTERS)[number]) => (i: InvoiceView) => !f.statuses || f.statuses.includes(i.status);
  const visible = invoices.filter(matches(filter));

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      {remindFor && <ReminderDialog invoice={remindFor} onClose={() => setRemindFor(null)} />}

      <div role="tablist" aria-label="Filter invoices" className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
        {FILTERS.map((f) => {
          const count = invoices.filter(matches(f)).length;
          const active = f.id === filterId;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilterId(f.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition duration-150 ease-standard active:scale-[0.97] ${
                active ? "bg-subtle text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {f.label}
              <span
                key={count}
                className={`animate-tick rounded-md px-1.5 text-xs tabular-nums transition-colors duration-150 ${active ? "bg-surface text-fg shadow-card" : "text-faint"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState filtered={invoices.length > 0} />
      ) : (
        <>
          {/* Desktop table */}
          <table key={`table-${filterId}`} className="hidden w-full text-left text-sm md:table">
            <thead className="text-xs font-medium text-faint">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Due</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((invoice, index) => {
                const hint = dueHint(invoice);
                return (
                  <tr
                    key={invoice.id}
                    style={stagger(Math.min(index, 10), 30)}
                    className="animate-fade-in transition-colors duration-150 hover:bg-subtle/50"
                  >
                    <td className="max-w-72 px-5 py-3.5">
                      <ClientCell invoice={invoice} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                      {formatMoney(invoice.total, invoice.currency)}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-muted">{formatDate(invoice.dueDate)}</p>
                      {hint && (
                        <p className={`text-xs ${hint.urgent ? "font-medium text-warning" : "text-faint"}`}>{hint.text}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={invoice.status} />
                      {invoice.reminderCount > 0 && invoice.status !== "PAID" && (
                        <p className="mt-1 text-xs text-faint">Reminded {invoice.reminderCount}×</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Actions invoice={invoice} onRemind={() => setRemindFor(invoice)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile list */}
          <ul key={`list-${filterId}`} className="divide-y divide-line md:hidden">
            {visible.map((invoice, index) => {
              const hint = dueHint(invoice);
              return (
                <li key={invoice.id} style={stagger(Math.min(index, 10), 30)} className="animate-enter space-y-3 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <ClientCell invoice={invoice} />
                    <p className="shrink-0 font-semibold tabular-nums">{formatMoney(invoice.total, invoice.currency)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={invoice.status} />
                      <span className={`text-xs ${hint?.urgent ? "font-medium text-warning" : "text-faint"}`}>
                        {hint?.text ?? `Due ${formatDate(invoice.dueDate)}`}
                      </span>
                    </div>
                    <Actions invoice={invoice} onRemind={() => setRemindFor(invoice)} />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
