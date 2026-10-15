import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Check,
  Coins,
  CreditCard,
  ImageIcon,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink, Logo, stagger } from "@/components/ui";

const STATS = [
  { value: "<30s", label: "from pasted chat to a sent invoice" },
  { value: "0", label: "fields you have to type by hand" },
  { value: "2/3", label: "of the steps are done by the AI" },
];

const STEPS: { title: string; body: string; actor: string }[] = [
  {
    title: "Paste the conversation",
    body: "A WhatsApp thread, an email, your call notes or a screenshot. Messy is fine, Hinglish too.",
    actor: "You",
  },
  {
    title: "Check the draft",
    body: "The AI fills in client, items, currency and due date, and highlights anything it couldn't find.",
    actor: "AI",
  },
  {
    title: "Send with PayPal",
    body: "One click creates a real PayPal invoice and emails your client a link to pay.",
    actor: "AI + PayPal",
  },
];

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: ImageIcon, title: "Reads screenshots", body: "Drop in a chat screenshot and it reads it like text." },
  { icon: ShieldCheck, title: "Never makes things up", body: "Missing an email or a price? It asks you instead of guessing." },
  { icon: Coins, title: "Any currency", body: "Understands ₹, €, “50 euros” and “2k”, and bills in the right one." },
  { icon: BellRing, title: "Reminders that fit", body: "AI writes a follow-up whose tone matches how overdue the invoice is." },
  { icon: Activity, title: "Live payment status", body: "The dashboard flips to Paid the moment your client pays." },
  { icon: CreditCard, title: "Paid through PayPal", body: "Clients pay by card or PayPal. No new account for them." },
];

const at = (ms: number) => ({ animationDelay: `${ms}ms` });

/** A value the AI pulls out of the chat; the same values reappear on the invoice. */
function Extract({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <mark
      className="animate-fade-in rounded-[4px] bg-brand-soft px-1 text-brand-text underline decoration-brand/40 decoration-dashed underline-offset-4"
      style={at(delay)}
    >
      {children}
    </mark>
  );
}

// The preview tells the product story once: chat arrives → values get picked out → invoice builds → Sent.
function HeroPreview() {
  return (
    <div className="animate-enter overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-pop" style={at(450)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5 font-mono text-[11px] tracking-wider text-faint uppercase">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-line-strong" />
          <span className="size-2 rounded-full bg-line-strong" />
          <span className="size-2 rounded-full bg-line-strong" />
        </span>
        <span>chat.txt → invoice #0042</span>
        <span className="hidden sm:inline">InvoiceGPT</span>
      </div>

      <div className="grid md:grid-cols-2">
        {/* Chat */}
        <div className="space-y-4 p-5 text-[15px] leading-relaxed sm:p-7">
          <p className="font-mono text-[11px] tracking-wider text-faint uppercase">01 · Pasted chat</p>
          <div className="animate-enter" style={at(700)}>
            <p className="text-xs font-semibold text-faint">Maya</p>
            <p>Loved the logo! Let&apos;s go with option B 🙌</p>
          </div>
          <div className="animate-enter" style={at(950)}>
            <p className="text-xs font-semibold text-faint">You</p>
            <p>
              Great! <Extract delay={1700}>$350</Extract> for the <Extract delay={1780}>logo</Extract> plus{" "}
              <Extract delay={1860}>$50</Extract> for the <Extract delay={1940}>brand guide</Extract>. Invoice to{" "}
              <Extract delay={2020}>maya@northwind.studio</Extract>?
            </p>
          </div>
          <div className="animate-enter" style={at(1200)}>
            <p className="text-xs font-semibold text-faint">Maya</p>
            <p>
              Perfect, we pay within <Extract delay={2100}>15 days</Extract>.
            </p>
          </div>
        </div>

        {/* Invoice */}
        <div className="relative border-t border-line bg-subtle/50 p-5 sm:p-7 md:border-t-0 md:border-l">
          <div className="animate-pop absolute top-1/2 -left-4 hidden md:block" style={at(1500)}>
            <span className="animate-halo grid size-8 place-items-center rounded-full border border-line-strong bg-surface text-brand-text">
              <Sparkles className="size-4" />
            </span>
          </div>

          <div className="flex items-start justify-between">
            <p className="font-mono text-[11px] tracking-wider text-faint uppercase">02 · Invoice</p>
            <span
              className="animate-pop inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success"
              style={at(2900)}
            >
              <Check className="animate-draw size-3 [--draw-delay:3000ms]" strokeWidth={3} /> Sent
            </span>
          </div>

          <div className="animate-enter mt-4" style={at(2250)}>
            <p className="text-xs text-faint">Bill to</p>
            <p className="font-medium">Maya · maya@northwind.studio</p>
          </div>

          <ul className="mt-5 space-y-2 border-t border-dashed border-line-strong pt-4 text-[15px]">
            <li className="animate-enter flex justify-between" style={at(2350)}>
              <span className="text-muted">Logo design</span>
              <span className="tabular-nums">$350.00</span>
            </li>
            <li className="animate-enter flex justify-between" style={at(2430)}>
              <span className="text-muted">Brand guide</span>
              <span className="tabular-nums">$50.00</span>
            </li>
          </ul>

          <div className="animate-enter mt-5 flex items-end justify-between border-t border-line-strong pt-4" style={at(2550)}>
            <span className="text-xs text-faint">Due in 15 days · USD</span>
            <span className="text-3xl font-semibold tracking-tight tabular-nums">$400.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ index, children }: { index: string; children: ReactNode }) {
  return (
    <p className="reveal flex items-center gap-3 font-mono text-xs tracking-wider text-faint uppercase">
      <span className="text-fg">{index}</span>
      <span className="h-px w-8 bg-line-strong" />
      {children}
    </p>
  );
}

/** Decorative layers behind the page: column guides, a dot grid and drifting glows under the hero. */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {/* Column guides along the content edges */}
      <div className="mx-auto h-full max-w-7xl border-x border-line/70" />

      <div className="absolute inset-x-0 top-0 h-[1400px] overflow-hidden">
        {/* Fine dots, plus a larger square grid that echoes the column guides */}
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_85%_70%_at_50%_0%,black,transparent)] [background-image:radial-gradient(var(--line-strong)_1.2px,transparent_1.2px)] [background-size:22px_22px]" />
        <div className="absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_10%,black,transparent)] [background-image:linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] [background-size:88px_88px]" />

        <div className="animate-drift absolute -top-40 left-[4%] size-[600px] rounded-full bg-brand/30 blur-[120px]" />
        <div className="animate-drift absolute top-32 right-[0%] size-[520px] rounded-full bg-fuchsia-500/25 blur-[120px] [animation-delay:-9s] [animation-direction:reverse]" />
        {/* Sits behind the product preview so the panel floats on light */}
        <div className="animate-drift absolute top-[720px] left-1/2 h-[380px] w-[900px] -translate-x-1/2 rounded-full bg-violet-500/20 blur-[140px] [animation-delay:-4s]" />
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative isolate overflow-x-clip">
      <Backdrop />
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#how" className="transition-colors hover:text-fg">
              How it works
            </a>
            <a href="#features" className="transition-colors hover:text-fg">
              Features
            </a>
            <Link href="/dashboard" className="transition-colors hover:text-fg">
              Dashboard
            </Link>
          </nav>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <ButtonLink href="/sign-in" variant="ghost" size="sm" className="hidden sm:inline-flex">
              Sign in
            </ButtonLink>
            <ButtonLink href="/new" size="sm" variant="inverse">
              Create invoice
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pt-14 pb-16 sm:px-6 sm:pt-24 sm:pb-24">
        <p
          style={stagger(0, 90)}
          className="animate-enter flex items-center gap-3 font-mono text-xs tracking-wider text-faint uppercase"
        >
          <span className="size-1.5 rounded-full bg-brand" />
          AI invoicing for freelancers · Paid via PayPal
        </p>
        <h1
          style={stagger(1, 90)}
          className="animate-enter mt-6 text-[clamp(3.25rem,10vw,8.5rem)] leading-[0.9] font-semibold tracking-[-0.05em]"
        >
          The chat
          <br />
          <span className="text-faint">is the invoice.</span>
        </h1>

        <div
          style={stagger(2, 90)}
          className="animate-enter mt-10 grid gap-8 border-t border-line pt-8 md:grid-cols-[1fr_auto] md:items-end"
        >
          <p className="max-w-lg text-lg leading-relaxed text-pretty text-muted sm:text-xl">
            Paste the conversation. InvoiceGPT drafts the invoice, you check it, and PayPal sends it.{" "}
            <span className="text-fg">Chat to cash in under 30 seconds.</span>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/new" size="lg" variant="inverse" className="group/cta">
              Create an invoice
              <ArrowRight className="size-4 transition-transform duration-250 ease-standard group-hover/cta:translate-x-1" />
            </ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary" size="lg">
              Open dashboard
            </ButtonLink>
          </div>
        </div>

        <p
          style={stagger(3, 90)}
          className="animate-enter mt-6 flex flex-wrap gap-x-6 gap-y-1 text-sm text-faint"
        >
          {["No sign-up needed", "Nothing sent without your OK", "Works with screenshots"].map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-fg" />
              {item}
            </span>
          ))}
        </p>

        <div className="mt-14 sm:mt-20">
          <HeroPreview />
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-line">
        <dl className="mx-auto grid max-w-7xl divide-y divide-line px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
          {STATS.map(({ value, label }) => (
            <div key={label} className="reveal py-8 md:px-8 md:py-12 md:first:pl-0 md:last:pr-0">
              <dt className="sr-only">{label}</dt>
              <dd className="text-6xl font-semibold tracking-[-0.04em] tabular-nums sm:text-7xl">{value}</dd>
              <dd className="mt-2 max-w-[16rem] text-sm text-muted">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
        <SectionLabel index="01">How it works</SectionLabel>
        <h2 className="reveal mt-5 max-w-3xl text-4xl leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-6xl">
          Three steps.
          <br className="hidden sm:block" /> <span className="text-faint">Most of them are the AI&apos;s.</span>
        </h2>

        <ol className="mt-14 border-t border-fg">
          {STEPS.map(({ title, body, actor }, index) => (
            <li
              key={title}
              className="reveal group grid gap-3 border-b border-line py-8 transition-colors duration-250 hover:bg-subtle/40 sm:grid-cols-[6rem_1fr] md:grid-cols-[8rem_1fr_1fr_7rem] md:items-baseline md:gap-8 md:py-10"
            >
              <span className="font-mono text-sm text-faint">0{index + 1}</span>
              <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h3>
              <p className="leading-relaxed text-muted sm:col-start-2 md:col-start-auto">{body}</p>
              <span
                className={`w-fit rounded-full border px-2.5 py-0.5 font-mono text-[11px] tracking-wider uppercase sm:col-start-2 md:col-start-auto md:justify-self-end ${
                  actor === "You" ? "border-line-strong text-muted" : "border-brand/30 bg-brand-soft text-brand-text"
                }`}
              >
                {actor}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-t border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionLabel index="02">Features</SectionLabel>
            <h2 className="reveal mt-5 text-4xl leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
              Built for the way freelancers actually agree on work.
            </h2>
          </div>

          <ul className="border-t border-fg">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="reveal group grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 border-b border-line py-6 sm:grid-cols-[auto_12rem_1fr] sm:items-baseline"
              >
                <Icon className="size-5 translate-y-1 text-faint transition-colors duration-250 group-hover:text-brand-text" />
                <h3 className="font-semibold">{title}</h3>
                <p className="col-start-2 leading-relaxed text-muted sm:col-start-auto">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA: inverted block, so it reads as the page's full stop in both themes */}
      <section className="bg-fg text-canvas">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <h2 className="reveal max-w-4xl text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] font-semibold tracking-[-0.045em] text-balance">
            Your next invoice is already in your chats.
          </h2>
          <div className="reveal mt-10 flex flex-col gap-6 border-t border-canvas/20 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-lg opacity-70">Paste one in and see the draft in seconds.</p>
            <Link
              href="/new"
              className="group inline-flex h-14 w-fit items-center gap-2 rounded-xl bg-canvas px-6 text-base font-semibold text-fg transition duration-150 ease-standard hover:-translate-y-0.5 active:scale-[0.97]"
            >
              Create an invoice
              <ArrowUpRight className="size-5 transition-transform duration-250 ease-standard group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 py-6 text-sm text-faint sm:flex-row sm:items-center sm:px-6">
          <Logo />
          <p>Running on PayPal Sandbox. No real money moves.</p>
        </div>
        <p
          aria-hidden
          className="mx-auto max-w-7xl overflow-hidden px-4 text-[clamp(4rem,17vw,15rem)] leading-[0.8] font-semibold tracking-[-0.06em] text-line select-none sm:px-6"
        >
          InvoiceGPT
        </p>
      </footer>
    </div>
  );
}
