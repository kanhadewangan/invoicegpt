import type { InvoiceStatus } from "@repo/shared";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, CSSProperties, ReactNode } from "react";

const BUTTON_VARIANTS = {
  primary:
    "bg-brand text-white shadow-sm shadow-brand/20 hover:bg-brand-hover disabled:opacity-50 disabled:shadow-none",
  secondary: "border border-line-strong bg-surface text-fg shadow-card hover:bg-subtle disabled:opacity-50",
  inverse: "bg-fg text-canvas hover:opacity-85 disabled:opacity-50",
  ghost: "text-muted hover:bg-subtle hover:text-fg disabled:opacity-50",
  danger: "bg-danger-soft text-danger hover:brightness-95 disabled:opacity-50",
};

const BUTTON_SIZES = {
  sm: "h-8 rounded-lg px-3 text-[13px]",
  md: "h-10 rounded-xl px-4 text-sm",
  lg: "h-12 rounded-xl px-5 text-[15px]",
};

type ButtonStyle = { variant?: keyof typeof BUTTON_VARIANTS; size?: keyof typeof BUTTON_SIZES };

export const buttonClass = ({ variant = "primary", size = "md" }: ButtonStyle = {}) =>
  `inline-flex shrink-0 items-center justify-center gap-2 font-semibold whitespace-nowrap outline-none transition-[scale,translate,background-color,border-color,box-shadow,color,opacity] duration-150 ease-standard active:scale-[0.97] disabled:active:scale-100 focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]}`;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyle & { loading?: boolean };

export function Button({ variant, size, loading, disabled, children, className = "", ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      className={`${buttonClass({ variant, size })} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className = "",
  ...props
}: ComponentProps<typeof Link> & ButtonStyle) {
  return <Link {...props} className={`${buttonClass({ variant, size })} ${className}`} />;
}

export function Spinner({ className = "size-4" }: { className?: string }) {
  return <LoaderCircle aria-hidden className={`animate-spin ${className}`} />;
}

export function Alert({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div
      role="alert"
      className="animate-shake flex gap-3 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"
    >
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 opacity-90">{children}</div>}
      </div>
    </div>
  );
}

/** Staggered entrances: pass to `style` on an element using animate-enter / animate-pop. */
export const stagger = (index: number, stepMs?: number) =>
  ({ "--i": index, ...(stepMs ? { "--stagger": `${stepMs}ms` } : {}) }) as CSSProperties;

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function CardTitle({ icon, children, aside }: { icon?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        {icon && <span className="text-faint [&>svg]:size-4">{icon}</span>}
        {children}
      </h2>
      {aside}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Shared text-input styling. `tone` highlights fields the AI couldn't fill or that failed validation. */
export const fieldClass = (tone: "default" | "missing" | "invalid" = "default") =>
  `w-full rounded-lg border bg-surface px-3 py-2 text-[15px] text-fg outline-none transition placeholder:text-faint focus:ring-4 ${
    tone === "invalid"
      ? "border-danger/60 focus:ring-danger-soft"
      : tone === "missing"
        ? "border-warning/50 bg-warning-soft focus:ring-warning-soft"
        : "border-line-strong focus:border-brand focus:ring-ring"
  }`;

export function Logo({ withName = true }: { withName?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 font-semibold tracking-tight">
      <span className="grid size-8 place-items-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-600 text-[13px] font-bold text-white shadow-sm shadow-indigo-500/30">
        IG
      </span>
      {withName && <span className="text-[17px]">InvoiceGPT</span>}
    </span>
  );
}

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: "bg-subtle text-muted",
  SENT: "bg-info-soft text-info",
  PAID: "bg-success-soft text-success",
  OVERDUE: "bg-warning-soft text-warning",
  CANCELLED: "bg-subtle text-faint line-through",
};

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Awaiting payment",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[status]}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Pill({ children, tone = "warning" }: { children: ReactNode; tone?: "warning" | "brand" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        tone === "warning" ? "bg-warning-soft text-warning" : "bg-brand-soft text-brand-text"
      }`}
    >
      {children}
    </span>
  );
}
