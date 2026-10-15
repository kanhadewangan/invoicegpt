"use client";

import type { ExtractedInvoice } from "@repo/shared";
import { Check } from "lucide-react";
import { useState } from "react";
import type { InvoiceView } from "@/lib/invoice-view";
import { PageHeader } from "../ui";
import { InputStep, type Example } from "./input-step";
import { ReviewStep } from "./review-step";
import { SentStep } from "./sent-step";

type State =
  | { step: "input"; text?: string }
  | { step: "review"; extracted: ExtractedInvoice; sourceText: string | null }
  | { step: "sent"; invoice: InvoiceView };

const STEPS = [
  { id: "input", label: "Paste", hint: "Chat, email or screenshot" },
  { id: "review", label: "Review", hint: "Check what the AI found" },
  { id: "sent", label: "Send", hint: "PayPal emails your client" },
] as const;

function Stepper({ current }: { current: State["step"] }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="grid grid-cols-3 gap-2 sm:gap-3">
      {STEPS.map((step, index) => {
        const done = index < currentIndex || current === "sent";
        const active = index === currentIndex && !done;
        return (
          <li
            key={step.id}
            aria-current={active ? "step" : undefined}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition duration-250 ease-standard sm:px-4 ${
              active ? "border-brand/40 bg-surface shadow-card" : "border-line bg-transparent"
            }`}
          >
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors duration-250 ${
                done ? "animate-pop bg-success text-white" : active ? "animate-halo bg-brand text-white" : "bg-subtle text-faint"
              }`}
            >
              {done ? <Check className="size-3.5 animate-draw [--draw-delay:120ms]" strokeWidth={3} /> : index + 1}
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${active || done ? "text-fg" : "text-faint"}`}>{step.label}</p>
              <p className="hidden truncate text-xs text-faint sm:block">{step.hint}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Composer({ examples }: { examples: Example[] }) {
  const [state, setState] = useState<State>({ step: "input" });
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New invoice"
        description="Paste the conversation. AI drafts the invoice, you check it, PayPal sends it."
      />
      <Stepper current={state.step} />

      <div key={state.step} className="animate-enter">
        {state.step === "input" && (
          <InputStep
            examples={examples}
            initialText={state.text}
            onStart={() => setStartedAt((current) => current ?? Date.now())}
            onExtracted={(extracted, sourceText) => setState({ step: "review", extracted, sourceText })}
          />
        )}
        {state.step === "review" && (
          <ReviewStep
            extracted={state.extracted}
            sourceText={state.sourceText}
            onBack={() => setState({ step: "input", text: state.sourceText ?? "" })}
            onSent={(invoice) => {
              setElapsedMs(startedAt === null ? null : Date.now() - startedAt);
              setState({ step: "sent", invoice });
            }}
          />
        )}
        {state.step === "sent" && (
          <SentStep
            invoice={state.invoice}
            elapsedMs={elapsedMs}
            onNew={() => {
              setStartedAt(null);
              setElapsedMs(null);
              setState({ step: "input" });
            }}
          />
        )}
      </div>
    </div>
  );
}
