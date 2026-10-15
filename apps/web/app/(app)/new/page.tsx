import type { Metadata } from "next";
import { EXAMPLE_MESSAGES } from "@repo/ai";
import { Composer } from "@/components/composer/composer";

export const metadata: Metadata = { title: "New invoice" };

export default function NewInvoicePage() {
  // Examples are read on the server so the AI package never ships to the browser.
  const examples = EXAMPLE_MESSAGES.map(({ id, label, text }) => ({ id, label, text }));
  return <Composer examples={examples} />;
}
