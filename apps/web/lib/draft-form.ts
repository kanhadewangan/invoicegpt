import { SendableInvoiceSchema, type ExtractedInvoice, type InvoiceField, type SendableInvoice } from "@repo/shared";

export type ItemRow = { key: string; name: string; quantity: string; unit_price: string };

/** The review form keeps numbers as strings so half-typed values like "12." stay editable. */
export type DraftForm = {
  client_name: string;
  client_email: string;
  currency: string;
  due_in_days: string;
  note: string;
  items: ItemRow[];
};

let nextKey = 0;
export const newItemRow = (item?: Partial<Omit<ItemRow, "key">>): ItemRow => ({
  key: `item-${nextKey++}`,
  name: item?.name ?? "",
  quantity: item?.quantity ?? "1",
  unit_price: item?.unit_price ?? "",
});

export function toDraftForm(extracted: ExtractedInvoice): DraftForm {
  return {
    client_name: extracted.client_name ?? "",
    client_email: extracted.client_email ?? "",
    currency: extracted.currency,
    due_in_days: extracted.due_in_days?.toString() ?? "",
    note: extracted.note ?? "",
    items: extracted.items.length
      ? extracted.items.map((item) =>
          newItemRow({ name: item.name, quantity: String(item.quantity), unit_price: String(item.unit_price) }),
        )
      : [newItemRow()],
  };
}

const toNumber = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));

export type FieldErrors = Record<string, string>;

/** Validates the form with the same Zod schema the API uses. Error keys look like "items.0.unit_price". */
export function parseDraftForm(form: DraftForm): { invoice: SendableInvoice } | { errors: FieldErrors } {
  const result = SendableInvoiceSchema.safeParse({
    client_name: form.client_name.trim() || null,
    client_email: form.client_email.trim(),
    currency: form.currency.trim().toUpperCase(),
    items: form.items.map((item) => ({
      name: item.name,
      quantity: toNumber(item.quantity),
      unit_price: toNumber(item.unit_price),
    })),
    due_in_days: toNumber(form.due_in_days),
    note: form.note.trim() || null,
  });
  if (result.success) return { invoice: result.data };

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    errors[key] ??= issue.message;
  }
  return { errors };
}

export const FIELD_LABELS: Record<InvoiceField, string> = {
  client_name: "client name",
  client_email: "client email",
  currency: "currency",
  items: "line items",
  due_in_days: "due date",
  note: "note",
};
