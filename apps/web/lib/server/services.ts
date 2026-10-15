import "server-only";
import { createAIClient, type AIClient } from "@repo/ai";
import { getDb } from "@repo/db";
import { createPayPalClient, type PayPalClient } from "@repo/paypal";
import { requireEnv } from "./env";

// Created lazily and reused so the PayPal OAuth token cache survives between requests.
let paypal: PayPalClient | undefined;
let ai: AIClient | undefined;

export function getPayPal(): PayPalClient {
  paypal ??= createPayPalClient({
    clientId: requireEnv("PAYPAL_CLIENT_ID"),
    clientSecret: requireEnv("PAYPAL_SECRET"),
    environment: "sandbox",
  });
  return paypal;
}

export function getAI(): AIClient {
  ai ??= createAIClient({ apiKey: requireEnv("LLM_API_KEY"), model: process.env.LLM_MODEL });
  return ai;
}

export function db() {
  requireEnv("DATABASE_URL");
  return getDb();
}
