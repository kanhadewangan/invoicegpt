import "server-only";
import { AIError } from "@repo/ai";
import { PayPalError } from "@repo/paypal";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ConfigError } from "./env";
import { InvoiceStateError } from "./invoices";

export type ApiError = { error: string; issues?: { path: string; message: string }[] };

const NETWORK_ERROR = /ENETUNREACH|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EHOSTUNREACH|Can't reach database/;

/** True when the database server couldn't be reached at all (as opposed to a query error). */
export function isDatabaseUnreachable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = error.cause instanceof Error ? error.cause.message : "";
  return NETWORK_ERROR.test(`${error.message} ${cause}`);
}

/** Turns any thrown error into a JSON response with a message that is safe to show users. */
export function errorResponse(error: unknown, extra: Record<string, unknown> = {}) {
  console.error(error);
  const json = (status: number, body: ApiError) => NextResponse.json({ ...body, ...extra }, { status });

  if (error instanceof ZodError) {
    return json(400, {
      error: "Some fields are invalid.",
      issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }
  if (error instanceof PayPalError) {
    // 4xx from PayPal usually means bad input (e.g. an email PayPal rejects).
    const status = error.status >= 400 && error.status < 500 && error.status !== 401 ? 400 : 502;
    return json(status, { error: `PayPal: ${error.message}` });
  }
  if (error instanceof AIError) {
    return json(error.reason === "service_unavailable" ? 503 : 422, { error: error.message });
  }
  if (error instanceof Error && "code" in error && error.code === "P2025") {
    // Prisma: record not found (or it belongs to another user)
    return json(404, { error: "Invoice not found." });
  }
  if (error instanceof InvoiceStateError) {
    return json(409, { error: error.message });
  }
  if (isDatabaseUnreachable(error)) {
    return json(503, { error: "Can't reach the database right now. Please try again in a moment." });
  }
  if (error instanceof ConfigError) {
    return json(500, { error: error.message });
  }
  return json(500, { error: "Something went wrong. Please try again." });
}
