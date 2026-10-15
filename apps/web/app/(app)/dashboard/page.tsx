import type { Metadata } from "next";
import { CircleCheck, Clock, FilePlus2, Hourglass, TriangleAlert, type LucideIcon } from "lucide-react";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { InvoiceTable } from "@/components/dashboard/invoice-table";
import { SyncButton } from "@/components/dashboard/sync-button";
import { ButtonLink, PageHeader, stagger } from "@/components/ui";
import { formatMoney, type InvoiceView } from "@/lib/invoice-view";
import { requireUser } from "@/lib/server/current-user";
import { listInvoices } from "@/lib/server/invoices";

export const metadata: Metadata = { title: "Invoices" };

// Always read fresh data from the database.
export const dynamic = "force-dynamic";

/** Sums per currency; adding USD to INR would be meaningless. */
function amountLabel(invoices: InvoiceView[]): string {
  if (invoices.length === 0) return formatMoney(0, "USD");
  const totals = new Map<string, number>();
  for (const invoice of invoices) totals.set(invoice.currency, (totals.get(invoice.currency) ?? 0) + invoice.total);
  return [...totals].map(([currency, total]) => formatMoney(total, currency)).join(" + ");
}

type Stat = { label: string; icon: LucideIcon; tone: string; invoices: InvoiceView[]; index: number };

function StatCard({ label, icon: Icon, tone, invoices, index }: Stat) {
  return (
    <div
      style={stagger(index + 1, 60)}
      className="group animate-enter rounded-2xl border border-line bg-surface p-5 shadow-card transition duration-250 ease-standard hover:-translate-y-0.5 hover:shadow-pop"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span
          className={`grid size-8 place-items-center rounded-lg transition-transform duration-250 ease-pop group-hover:scale-110 ${tone}`}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 truncate text-2xl font-semibold tracking-tight tabular-nums" title={amountLabel(invoices)}>
        {amountLabel(invoices)}
      </p>
      <p className="mt-0.5 text-xs text-faint">
        {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const invoices = await listInvoices(user.id);
  const withStatus = (...statuses: InvoiceView["status"][]) => invoices.filter((i) => statuses.includes(i.status));
  const stats: Omit<Stat, "index">[] = [
    { label: "Outstanding", icon: Hourglass, tone: "bg-info-soft text-info", invoices: withStatus("SENT", "OVERDUE") },
    { label: "Overdue", icon: TriangleAlert, tone: "bg-warning-soft text-warning", invoices: withStatus("OVERDUE") },
    { label: "Paid", icon: CircleCheck, tone: "bg-success-soft text-success", invoices: withStatus("PAID") },
    { label: "Drafts", icon: Clock, tone: "bg-subtle text-muted", invoices: withStatus("DRAFT") },
  ];

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <PageHeader
        title="Invoices"
        description="Everything you've sent, and who still owes you."
        actions={
          <>
            <SyncButton />
            <ButtonLink href="/new">
              <FilePlus2 className="size-4" />
              New invoice
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={stat.label} {...stat} index={index} />
        ))}
      </div>

      <div className="animate-enter" style={stagger(5, 60)}>
        <InvoiceTable invoices={invoices} />
      </div>
    </div>
  );
}
