"use client";

import { Check, ExternalLink, LayoutDashboard, Plus, Timer } from "lucide-react";
import { formatMoney, type InvoiceView } from "@/lib/invoice-view";
import { Button, ButtonLink, buttonClass } from "../ui";

type Props = { invoice: InvoiceView; elapsedMs: number | null; onNew: () => void };

// Choreography: card rises (0ms) → ring ripples + check pops (150ms) → check draws (400ms)
// → copy and details cascade (from ~450ms). Total under 1s.
const after = (ms: number) => ({ animationDelay: `${ms}ms` });

export function SentStep({ invoice, elapsedMs, onNew }: Props) {
  const due = new Date(invoice.dueDate).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" });
  return (
    <div className="animate-dialog mx-auto max-w-xl overflow-hidden rounded-3xl border border-line bg-surface text-center shadow-pop">
      <div className="relative bg-gradient-to-b from-success-soft to-transparent px-6 pt-10 pb-2">
        <div className="relative mx-auto size-16">
          <span aria-hidden className="animate-ripple absolute inset-0 rounded-full bg-success [--ripple-delay:150ms]" />
          <span aria-hidden className="animate-ripple absolute inset-0 rounded-full bg-success [--ripple-delay:450ms]" />
          <div
            className="animate-pop relative grid size-16 place-items-center rounded-full bg-success text-white shadow-lg shadow-success/30 ring-8 ring-success-soft"
            style={after(150)}
          >
            <Check className="animate-draw size-8 [--draw-delay:400ms]" strokeWidth={3} />
          </div>
        </div>
        <h2 className="animate-enter mt-5 text-2xl font-semibold tracking-tight" style={after(450)}>
          Invoice sent
        </h2>
        <p className="animate-enter mt-1.5 text-muted" style={after(520)}>
          PayPal has emailed{" "}
          <span className="font-medium text-fg">{invoice.clientName ?? invoice.clientEmail}</span> a link to pay.
        </p>
        {elapsedMs !== null && (
          <p
            className="animate-pop mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand-text"
            style={after(700)}
          >
            <Timer className="size-4" />
            Chat to invoice in {(elapsedMs / 1000).toFixed(1)}s
          </p>
        )}
      </div>

      <dl style={after(600)} className="animate-enter mx-6 mt-6 grid grid-cols-3 divide-x divide-line rounded-xl border border-line text-sm">
        <div className="px-3 py-3">
          <dt className="text-xs text-faint">Amount</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{formatMoney(invoice.total, invoice.currency)}</dd>
        </div>
        <div className="px-3 py-3">
          <dt className="text-xs text-faint">Due</dt>
          <dd className="mt-0.5 font-semibold">{due}</dd>
        </div>
        <div className="px-3 py-3">
          <dt className="text-xs text-faint">Invoice</dt>
          <dd className="mt-0.5 truncate font-semibold">
            {invoice.paypalInvoiceNumber ? `#${invoice.paypalInvoiceNumber}` : "—"}
          </dd>
        </div>
      </dl>

      <div style={after(680)} className="animate-enter flex flex-col justify-center gap-2 px-6 pt-6 pb-8 sm:flex-row">
        {invoice.payLink && (
          <a href={invoice.payLink} target="_blank" rel="noreferrer" className={buttonClass({ variant: "secondary" })}>
            <ExternalLink className="size-4" />
            Client&apos;s view
          </a>
        )}
        <ButtonLink href="/dashboard" variant="secondary">
          <LayoutDashboard className="size-4" />
          Dashboard
        </ButtonLink>
        <Button onClick={onNew}>
          <Plus className="size-4" />
          New invoice
        </Button>
      </div>
    </div>
  );
}
