// Runs extraction on every example message and checks the result against its expectations.
// Usage: bun run try:extract   (uses LLM_API_KEY from apps/web/.env.local)
import { invoiceTotal } from "@repo/shared";
import { createAIClient, EXAMPLE_MESSAGES, extractInvoice, type ExampleMessage } from "../src";
import type { ExtractedInvoice } from "@repo/shared";

const apiKey = process.env.LLM_API_KEY;
if (!apiKey) {
  console.error("Set LLM_API_KEY (your OpenRouter key) in apps/web/.env.local");
  process.exit(1);
}
const client = createAIClient({ apiKey, model: process.env.LLM_MODEL });
console.log(`Model: ${client.model}`);

function check(example: ExampleMessage, result: ExtractedInvoice): string[] {
  const { expected } = example;
  const problems: string[] = [];
  const sameSet = (a: string[], b: string[]) =>
    a.length === b.length && a.every((value) => b.includes(value));

  if (result.currency !== expected.currency) {
    problems.push(`currency ${result.currency}, expected ${expected.currency}`);
  }
  if (result.items.length !== expected.itemCount) {
    problems.push(`${result.items.length} items, expected ${expected.itemCount}`);
  }
  if (expected.total !== undefined && invoiceTotal(result.items) !== expected.total) {
    problems.push(`total ${invoiceTotal(result.items)}, expected ${expected.total}`);
  }
  if (result.client_email !== expected.client_email) {
    problems.push(`email ${result.client_email}, expected ${expected.client_email}`);
  }
  if (expected.due_in_days !== undefined && result.due_in_days !== expected.due_in_days) {
    problems.push(`due_in_days ${result.due_in_days}, expected ${expected.due_in_days}`);
  }
  if (!sameSet(result.missing_fields, expected.missing)) {
    problems.push(`missing [${result.missing_fields}], expected [${expected.missing}]`);
  }
  return problems;
}

const results = await Promise.all(
  EXAMPLE_MESSAGES.map(async (example) => {
    const started = Date.now();
    try {
      const result = await extractInvoice(client, { text: example.text });
      return { example, result, problems: check(example, result), ms: Date.now() - started };
    } catch (error) {
      return { example, error, problems: ["request failed"], ms: Date.now() - started };
    }
  }),
);

let failures = 0;
for (const { example, result, error, problems, ms } of results) {
  const ok = problems.length === 0;
  if (!ok) failures++;
  console.log(`\n${ok ? "PASS" : "FAIL"}  ${example.label}  (${(ms / 1000).toFixed(1)}s)`);
  if (error) console.log("  ", error);
  if (result) console.log(JSON.stringify(result, null, 2).replace(/^/gm, "    "));
  for (const problem of problems) console.log(`  - ${problem}`);
}

console.log(`\n${results.length - failures}/${results.length} examples passed`);
process.exit(failures ? 1 : 0);
