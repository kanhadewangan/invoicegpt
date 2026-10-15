"use client";

import type { ExtractedInvoice } from "@repo/shared";
import {
  CalendarClock,
  Coins,
  FileText,
  ImagePlus,
  ListChecks,
  Mail,
  MessageCircle,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { ApiClientError, postJson } from "@/lib/api-client";
import { Alert, Button, Card, stagger } from "../ui";

export type Example = { id: string; label: string; text: string };
type Screenshot = { data: string; mediaType: string; name: string; previewUrl: string };

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function readImage(file: File): Promise<Screenshot> {
  return new Promise((resolve, reject) => {
    if (!IMAGE_TYPES.includes(file.type)) return reject(new Error("Use a PNG, JPEG, WebP or GIF image."));
    if (file.size > MAX_IMAGE_BYTES) return reject(new Error("That image is too large (3 MB max)."));
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      resolve({
        data: dataUrl.slice(dataUrl.indexOf(",") + 1),
        mediaType: file.type,
        name: file.name || "Pasted screenshot",
        previewUrl: dataUrl,
      });
    };
    reader.onerror = () => reject(new Error("Couldn't read that image."));
    reader.readAsDataURL(file);
  });
}

/** Example labels start with their source ("Email: …"), which picks the icon. */
function exampleIcon(label: string) {
  const source = label.toLowerCase();
  if (source.startsWith("email")) return Mail;
  if (source.startsWith("call") || source.startsWith("note")) return FileText;
  return MessageCircle;
}

const EXTRACTED_FIELDS = [
  { icon: UserRound, label: "Client name & email" },
  { icon: ListChecks, label: "Line items, quantities, prices" },
  { icon: Coins, label: "Currency, even from ₹ or “euros”" },
  { icon: CalendarClock, label: "Payment terms → due date" },
];

type Props = {
  examples: Example[];
  initialText?: string;
  onStart: () => void;
  onExtracted: (extracted: ExtractedInvoice, sourceText: string | null) => void;
};

export function InputStep({ examples, initialText = "", onStart, onExtracted }: Props) {
  const [text, setText] = useState(initialText);
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function attach(file: File | undefined) {
    if (!file) return;
    try {
      setScreenshot(await readImage(file));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handlePaste(event: ClipboardEvent) {
    const file = [...event.clipboardData.files].find((f) => f.type.startsWith("image/"));
    if (file) {
      event.preventDefault();
      void attach(file);
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void attach([...event.dataTransfer.files].find((f) => f.type.startsWith("image/")));
  }

  async function extract() {
    setLoading(true);
    setError(null);
    onStart();
    try {
      const extracted = await postJson<ExtractedInvoice>("/api/extract", {
        text: text.trim() || undefined,
        image: screenshot ? { data: screenshot.data, mediaType: screenshot.mediaType } : undefined,
      });
      onExtracted(extracted, text.trim() || null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = (text.trim() || screenshot) && !loading;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-5">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`relative rounded-2xl border bg-surface shadow-card transition focus-within:border-brand focus-within:ring-4 focus-within:ring-ring ${
            dragging ? "border-brand ring-4 ring-ring" : "border-line"
          }`}
        >
          <label htmlFor="source" className="sr-only">
            Paste a client chat, email or your notes
          </label>
          <textarea
            id="source"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onPaste={handlePaste}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && canSubmit) void extract();
            }}
            rows={10}
            disabled={loading}
            placeholder={
              "Paste a client chat, email or your own notes…\n\nClient: Loved the logo! Let's go with option B.\nMe: Great, that's $350. Invoice to client@company.com?\nClient: Yes, we pay within 15 days."
            }
            className="block w-full resize-y rounded-t-2xl bg-transparent px-5 pt-5 pb-3 text-[15px] leading-relaxed outline-none placeholder:text-faint disabled:opacity-60"
          />

          {loading && (
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 bottom-[61px] overflow-hidden rounded-t-2xl">
              <div className="animate-scan absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,var(--ring)_16%,transparent_24%)]" />
            </div>
          )}

          {dragging && (
            <div className="animate-fade-in pointer-events-none absolute inset-0 grid place-items-center rounded-2xl bg-brand-soft/80 text-sm font-semibold text-brand-text backdrop-blur-[1px]">
              <span className="flex items-center gap-2">
                <ImagePlus className="size-5" /> Drop the screenshot here
              </span>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-line px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:pl-4">
            <div className="flex min-w-0 items-center gap-2">
              <input
                ref={fileInput}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={(event) => {
                  void attach(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              {screenshot ? (
                <div className="animate-pop flex min-w-0 items-center gap-2.5 rounded-lg border border-line bg-subtle py-1 pr-1 pl-1">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                  <img src={screenshot.previewUrl} alt="" className="size-8 rounded-md object-cover" />
                  <span className="max-w-40 truncate text-sm text-muted">{screenshot.name}</span>
                  <button
                    type="button"
                    onClick={() => setScreenshot(null)}
                    aria-label="Remove screenshot"
                    className="grid size-7 place-items-center rounded-md text-faint hover:bg-surface hover:text-danger"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()} disabled={loading}>
                  <ImagePlus className="size-4" />
                  Add screenshot
                </Button>
              )}
              <span className="hidden text-xs text-faint md:inline">or paste / drop one in</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-faint sm:inline">
                <kbd className="rounded border border-line bg-subtle px-1 font-sans">Ctrl</kbd> +{" "}
                <kbd className="rounded border border-line bg-subtle px-1 font-sans">Enter</kbd>
              </span>
              <Button onClick={extract} disabled={!canSubmit} loading={loading} className="group/cta w-full sm:w-auto">
                {!loading && <Sparkles className="size-4 transition-transform duration-250 ease-pop group-hover/cta:rotate-12 group-hover/cta:scale-110" />}
                {loading ? "Reading the conversation…" : "Create invoice draft"}
              </Button>
            </div>
          </div>
        </div>

        {error && <Alert title="Couldn't read that">{error}</Alert>}

        <div>
          <p className="mb-2.5 text-xs font-semibold tracking-wider text-faint uppercase">Or try an example</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {examples.map((example, index) => {
              const Icon = exampleIcon(example.label);
              const [source, ...rest] = example.label.split(":");
              return (
                <button
                  key={example.id}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setText(example.text);
                    setScreenshot(null);
                  }}
                  style={stagger(index + 2, 40)}
                  className="group animate-enter flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left shadow-card transition duration-150 ease-standard hover:-translate-y-0.5 hover:border-brand/40 hover:bg-brand-soft/40 hover:shadow-pop active:translate-y-0 disabled:opacity-50"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-subtle text-muted transition duration-150 group-hover:scale-110 group-hover:bg-brand-soft group-hover:text-brand-text">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-faint">{rest.length ? source : "Example"}</span>
                    <span className="block truncate text-sm font-medium">{rest.join(":").trim() || source}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="animate-enter space-y-4" style={stagger(2, 80)}>
        <Card className="!p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-brand-text" />
            What the AI looks for
          </p>
          <ul className="mt-4 space-y-3">
            {EXTRACTED_FIELDS.map(({ icon: Icon, label }, index) => (
              <li key={label} style={stagger(index + 4, 50)} className="animate-enter flex items-start gap-2.5 text-sm text-muted">
                <Icon className="mt-0.5 size-4 shrink-0 text-faint" />
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-lg bg-subtle px-3 py-2.5 text-xs leading-relaxed text-muted">
            It never guesses. Anything it can&apos;t find is highlighted for you to fill in, and nothing is sent
            until you click <span className="font-semibold text-fg">Send</span>.
          </p>
        </Card>
      </aside>
    </div>
  );
}
