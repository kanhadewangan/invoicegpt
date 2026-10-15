"use client";

import { ReminderMessageSchema } from "@repo/shared";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiClientError, postJson } from "@/lib/api-client";
import { formatMoney, type InvoiceView } from "@/lib/invoice-view";
import { BellRing, Check, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { Alert, Button, fieldClass } from "../ui";

type Tone = "friendly" | "firm" | "urgent" | "final";
type Draft = { subject: string; note: string; tone: Tone };

const TONE_STYLES: Record<Tone, string> = {
  friendly: "bg-success-soft text-success",
  firm: "bg-info-soft text-info",
  urgent: "bg-warning-soft text-warning",
  final: "bg-danger-soft text-danger",
};

export function ReminderDialog({ invoice, onClose }: { invoice: InvoiceView; onClose: () => void }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  async function generate() {
    setDraft(null);
    setLoadError(null);
    try {
      setDraft(await postJson<Draft>(`/api/invoices/${invoice.id}/reminder/draft`));
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : "Couldn't write a reminder.");
    }
  }

  useEffect(() => {
    void generate();
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // Generate once when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    if (!draft) return;
    const parsed = ReminderMessageSchema.safeParse({ subject: draft.subject, note: draft.note });
    if (!parsed.success) {
      setSendError("Add a subject and a message before sending.");
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      await postJson(`/api/invoices/${invoice.id}/reminder`, parsed.data);
      setSent(true);
      router.refresh();
      setTimeout(onClose, 1200);
    } catch (err) {
      setSendError(err instanceof ApiClientError ? err.message : "Couldn't send the reminder.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg animate-dialog rounded-2xl border border-line bg-surface p-6 shadow-pop outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-text">
              <BellRing className="size-5" />
            </span>
            <div>
              <h2 id="reminder-title" className="text-lg font-semibold">
                Payment reminder
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                {formatMoney(invoice.total, invoice.currency)} · {invoice.clientName ?? invoice.clientEmail}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {draft && (
              <span
                key={draft.tone}
                className={`animate-pop rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${TONE_STYLES[draft.tone]}`}
              >
                {draft.tone} tone
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-8 place-items-center rounded-lg text-faint hover:bg-subtle hover:text-fg"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-5">
          {!draft && !loadError && (
            <div className="space-y-3" aria-live="polite">
              <p className="flex items-center gap-2 text-sm text-muted">
                <Sparkles className="size-4 animate-pulse text-brand-text" />
                Writing a reminder that fits how overdue this is…
              </p>
              <div className="animate-shimmer h-10 rounded-lg" />
              <div className="animate-shimmer h-36 rounded-lg" />
            </div>
          )}
          {loadError && (
            <div className="space-y-3">
              <Alert title="Couldn't write a reminder">{loadError}</Alert>
              <Button variant="secondary" onClick={generate}>
                Try again
              </Button>
            </div>
          )}
          {draft && (
            <div className="animate-enter space-y-4">
              <div>
                <label htmlFor="reminder-subject" className="mb-1.5 block text-sm font-medium text-muted">
                  Subject
                </label>
                <input
                  id="reminder-subject"
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  className={fieldClass()}
                />
              </div>
              <div>
                <label htmlFor="reminder-note" className="mb-1.5 block text-sm font-medium text-muted">
                  Message
                </label>
                <textarea
                  id="reminder-note"
                  rows={6}
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  className={fieldClass()}
                />
                <p className="mt-1 text-xs text-faint">PayPal adds the invoice and a Pay button below your message.</p>
              </div>
            </div>
          )}
        </div>

        {sendError && (
          <div className="mt-4">
            <Alert title="Reminder not sent">{sendError}</Alert>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          {draft && (
            <Button variant="ghost" onClick={generate} disabled={sending || sent} className="mr-auto">
              <RefreshCw className="size-4" />
              Rewrite
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} disabled={!draft || sent} loading={sending}>
            {sent ? (
              <Check className="animate-draw size-4" strokeWidth={3} />
            ) : (
              !sending && <Send className="size-4" />
            )}
            {sent ? "Sent" : "Send reminder"}
          </Button>
        </div>
      </div>
    </div>
  );
}
