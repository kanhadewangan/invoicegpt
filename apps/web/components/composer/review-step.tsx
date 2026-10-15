"use client";

import { dueDateFromDays, invoiceTotal, type ExtractedInvoice, type InvoiceField } from "@repo/shared";
import {
  ArrowLeft,
  CircleAlert,
  CreditCard,
  ListChecks,
  MessageSquareText,
  Plus,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { ApiClientError, postJson } from "@/lib/api-client";
import {
  FIELD_LABELS,
  newItemRow,
  parseDraftForm,
  toDraftForm,
  type DraftForm,
  type FieldErrors,
  type ItemRow,
} from "@/lib/draft-form";
import { formatMoney, type InvoiceView } from "@/lib/invoice-view";
import { Alert, Button, Card, CardTitle, Pill, fieldClass, stagger } from "../ui";

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY", "SGD"];

const tone = (missing: boolean, invalid: boolean) => (invalid ? "invalid" : missing ? "missing" : "default");

function Field(props: { label: string; htmlFor: string; missing?: boolean; error?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={props.htmlFor} className="text-sm font-medium text-muted">
          {props.label}
        </label>
        {props.missing && !props.error && <Pill>Not in message</Pill>}
      </div>
      {props.children}
      {props.error && <p className="animate-fade-in mt-1 text-sm text-danger">{props.error}</p>}
    </div>
  );
}

type Props = {
  extracted: ExtractedInvoice;
  sourceText: string | null;
  onBack: () => void;
  onSent: (invoice: InvoiceView) => void;
};

export function ReviewStep({ extracted, sourceText, onBack, onSent }: Props) {
  const [form, setForm] = useState<DraftForm>(() => toDraftForm(extracted));
  const [missing, setMissing] = useState<InvoiceField[]>(extracted.missing_fields);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<{ message: string; savedAsDraft: boolean } | null>(null);

  const isMissing = (field: InvoiceField) => missing.includes(field);

  function update<K extends Exclude<keyof DraftForm, "items">>(field: K, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setMissing((current) => current.filter((f) => f !== field));
  }

  function updateItem(key: string, patch: Partial<ItemRow>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
    setMissing((current) => current.filter((f) => f !== "items"));
  }

  const setItems = (items: ItemRow[]) => setForm((current) => ({ ...current, items }));

  const lineItems = form.items.map((item) => ({
    key: item.key,
    name: item.name,
    quantity: Number(item.quantity) || 0,
    unit_price: Number(item.unit_price) || 0,
  }));
  const liveTotal = invoiceTotal(lineItems);
  const dueDays = Number(form.due_in_days);
  const dueDatePreview =
    form.due_in_days.trim() !== "" && Number.isInteger(dueDays) && dueDays >= 0 && dueDays <= 365
      ? new Date(dueDateFromDays(dueDays)).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })
      : null;

  async function send() {
    const parsed = parseDraftForm(form);
    if ("errors" in parsed) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setSendError(null);
    setSending(true);
    try {
      const { invoice } = await postJson<{ invoice: InvoiceView }>("/api/invoices", {
        invoice: parsed.invoice,
        sourceText,
      });
      onSent(invoice);
    } catch (err) {
      const apiError = err instanceof ApiClientError ? err : null;
      setSendError({
        message: apiError?.message ?? "Something went wrong. Please try again.",
        savedAsDraft: Boolean(apiError?.savedDraftId),
      });
    } finally {
      setSending(false);
    }
  }

  const currencyLabel = form.currency.trim().toUpperCase() || "USD";
  const money = (amount: number) => formatMoney(amount, currencyLabel);
  const stillMissing = missing.filter((f) => f !== "note");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        {stillMissing.length > 0 && (
          <div className="animate-enter flex gap-3 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-warning">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              The AI couldn&apos;t find the <strong>{stillMissing.map((f) => FIELD_LABELS[f]).join(", ")}</strong>.
              Fill in the highlighted fields before sending.
            </p>
          </div>
        )}

        <Card>
          <CardTitle icon={<UserRound />}>Bill to</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client name" htmlFor="client_name" missing={isMissing("client_name")} error={errors.client_name}>
              <input
                id="client_name"
                value={form.client_name}
                onChange={(e) => update("client_name", e.target.value)}
                placeholder="Optional"
                className={fieldClass(tone(isMissing("client_name"), Boolean(errors.client_name)))}
              />
            </Field>
            <Field label="Client email" htmlFor="client_email" missing={isMissing("client_email")} error={errors.client_email}>
              <input
                id="client_email"
                type="email"
                value={form.client_email}
                onChange={(e) => update("client_email", e.target.value)}
                placeholder="client@company.com"
                className={fieldClass(tone(isMissing("client_email"), Boolean(errors.client_email)))}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle icon={<ListChecks />} aside={isMissing("items") && <Pill>Some prices weren&apos;t found</Pill>}>
            Line items
          </CardTitle>
          <div className="hidden grid-cols-[1fr_72px_120px_100px_36px] gap-2 px-1 pb-2 text-xs font-medium text-faint sm:grid">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit price</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          <div className="space-y-3 sm:space-y-2">
            {form.items.map((item, index) => {
              const err = (field: string) => errors[`items.${index}.${field}`];
              const amount = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
              return (
                <div
                  key={item.key}
                  style={stagger(Math.min(index, 8), 30)}
                  className="animate-enter grid grid-cols-[72px_1fr_36px] gap-2 rounded-xl border border-line p-2 sm:grid-cols-[1fr_72px_120px_100px_36px] sm:items-center sm:rounded-none sm:border-0 sm:p-0"
                >
                  <input
                    aria-label="Description"
                    value={item.name}
                    onChange={(e) => updateItem(item.key, { name: e.target.value })}
                    placeholder="e.g. Logo design"
                    className={`${fieldClass(tone(isMissing("items") && !item.name, Boolean(err("name"))))} col-span-3 sm:col-span-1`}
                  />
                  <input
                    aria-label="Quantity"
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                    className={`${fieldClass(tone(false, Boolean(err("quantity"))))} tabular-nums`}
                  />
                  <input
                    aria-label="Unit price"
                    inputMode="decimal"
                    value={item.unit_price}
                    onChange={(e) => updateItem(item.key, { unit_price: e.target.value })}
                    placeholder="0.00"
                    className={`${fieldClass(tone(isMissing("items") && !item.unit_price, Boolean(err("unit_price"))))} tabular-nums`}
                  />
                  <span key={amount} className="animate-tick hidden text-right text-sm font-medium text-muted tabular-nums sm:block">
                    {money(amount)}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove item"
                    onClick={() => setItems(form.items.filter((i) => i.key !== item.key))}
                    disabled={form.items.length === 1}
                    className="grid size-9 place-items-center rounded-lg text-faint transition hover:bg-danger-soft hover:text-danger disabled:invisible"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  {(err("name") || err("quantity") || err("unit_price")) && (
                    <p className="animate-fade-in col-span-full text-sm text-danger">
                      {err("name") ?? err("quantity") ?? err("unit_price")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {errors.items && <p className="mt-2 text-sm text-danger">{errors.items}</p>}
          <Button variant="ghost" size="sm" className="mt-3 -ml-2" onClick={() => setItems([...form.items, newItemRow()])}>
            <Plus className="size-4" />
            Add item
          </Button>
        </Card>

        <Card>
          <CardTitle icon={<CreditCard />}>Payment</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency" htmlFor="currency" missing={isMissing("currency")} error={errors.currency}>
              <input
                id="currency"
                list="currencies"
                value={form.currency}
                onChange={(e) => update("currency", e.target.value.toUpperCase())}
                maxLength={3}
                className={fieldClass(tone(isMissing("currency"), Boolean(errors.currency)))}
              />
              <datalist id="currencies">
                {CURRENCIES.map((code) => (
                  <option key={code} value={code} />
                ))}
              </datalist>
            </Field>
            <Field label="Due in (days)" htmlFor="due_in_days" missing={isMissing("due_in_days")} error={errors.due_in_days}>
              <input
                id="due_in_days"
                inputMode="numeric"
                value={form.due_in_days}
                onChange={(e) => update("due_in_days", e.target.value)}
                placeholder="e.g. 14"
                className={fieldClass(tone(isMissing("due_in_days"), Boolean(errors.due_in_days)))}
              />
              {dueDatePreview && <p className="mt-1 text-xs text-faint">Due {dueDatePreview}</p>}
            </Field>
            <div className="sm:col-span-2">
              <Field label="Note to client" htmlFor="note" error={errors.note}>
                <textarea
                  id="note"
                  rows={2}
                  value={form.note}
                  onChange={(e) => update("note", e.target.value)}
                  placeholder="Optional, e.g. PO number or payment terms"
                  className={fieldClass(tone(false, Boolean(errors.note)))}
                />
              </Field>
            </div>
          </div>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        {/* Live preview of what the client will receive */}
        <div className="animate-enter overflow-hidden rounded-2xl border border-line bg-surface shadow-pop" style={stagger(2, 80)}>
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wider text-faint uppercase">Invoice</p>
                <p className="mt-1 text-sm font-medium">
                  {form.client_name.trim() || <span className="text-faint">Client name</span>}
                </p>
                <p className="truncate text-xs text-muted">
                  {form.client_email.trim() || <span className="text-faint">client@email.com</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-faint">Due</p>
                <p className="text-sm font-medium">{dueDatePreview ?? "—"}</p>
              </div>
            </div>

            <ul className="mt-5 space-y-2 border-t border-dashed border-line pt-4 text-sm">
              {lineItems.map((item) => (
                <li key={item.key} className="animate-fade-in flex justify-between gap-3">
                  <span className="min-w-0 truncate text-muted">
                    {item.name.trim() || <span className="text-faint">Untitled item</span>}
                    {item.quantity !== 1 && <span className="text-faint"> × {item.quantity}</span>}
                  </span>
                  <span className="tabular-nums">{money(item.quantity * item.unit_price)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
              <span className="text-sm font-medium text-muted">Total</span>
              <span key={liveTotal} className="animate-tick text-[28px] leading-none font-semibold tracking-tight tabular-nums">
                {money(liveTotal)}
              </span>
            </div>

            <Button onClick={send} loading={sending} size="lg" className="group/send mt-5 w-full">
              {!sending && (
                <Send className="size-4 transition-transform duration-250 ease-standard group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5" />
              )}
              {sending ? "Sending via PayPal…" : "Send invoice"}
            </Button>
            <Button variant="ghost" onClick={onBack} disabled={sending} className="group/back mt-1.5 w-full">
              <ArrowLeft className="size-4 transition-transform duration-150 group-hover/back:-translate-x-0.5" />
              Back to message
            </Button>
            <p className="mt-2 text-center text-xs text-faint">Nothing is sent until you click Send.</p>
          </div>
        </div>

        {Object.keys(errors).length > 0 && <Alert title="Fix the highlighted fields before sending." />}
        {sendError && (
          <Alert title="Invoice not sent">
            {sendError.message}
            {sendError.savedAsDraft && " It was saved as a draft, so you can retry from the dashboard."}
          </Alert>
        )}

        {sourceText && (
          <details className="group rounded-2xl border border-line bg-surface shadow-card">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-muted hover:text-fg">
              <MessageSquareText className="size-4" />
              Original message
              <span className="ml-auto text-xs text-faint group-open:hidden">Show</span>
              <span className="ml-auto hidden text-xs text-faint group-open:inline">Hide</span>
            </summary>
            <p className="max-h-60 overflow-y-auto border-t border-line px-4 py-3 text-sm whitespace-pre-wrap text-muted">
              {sourceText}
            </p>
          </details>
        )}
      </aside>
    </div>
  );
}
