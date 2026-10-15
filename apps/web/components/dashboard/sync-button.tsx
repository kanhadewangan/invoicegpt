"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError, postJson } from "@/lib/api-client";
import { Button } from "../ui";

export function SyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  async function sync() {
    setLoading(true);
    setMessage(null);
    try {
      const { updated } = await postJson<{ updated: number }>("/api/invoices/sync");
      setMessage({ text: updated ? `${updated} invoice(s) updated` : "Everything is up to date", isError: false });
      router.refresh();
    } catch (err) {
      setMessage({ text: err instanceof ApiClientError ? err.message : "Sync failed", isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && (
        <span role="status" className={`animate-fade-in max-w-64 text-sm ${message.isError ? "text-danger" : "text-faint"}`}>
          {message.text}
        </span>
      )}
      <Button variant="secondary" onClick={sync} disabled={loading}>
        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        Sync with PayPal
      </Button>
    </div>
  );
}
