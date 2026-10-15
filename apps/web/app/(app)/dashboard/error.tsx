"use client";

import { DatabaseZap, RotateCw } from "lucide-react";
import { Button } from "@/components/ui";

// `retry` re-fetches the page's server data; `reset` would only re-render and hit the same error.
export default function DashboardError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger">
        <DatabaseZap className="size-6" />
      </span>
      <h1 className="mt-4 text-lg font-semibold">Couldn&apos;t load your invoices</h1>
      <p className="mt-1 text-sm text-muted">
        The database didn&apos;t respond. Check <code className="font-mono text-xs">DATABASE_URL</code> in
        apps/web/.env.local, then try again.
      </p>
      <Button onClick={() => retry()} className="mt-5">
        <RotateCw className="size-4" />
        Try again
      </Button>
    </div>
  );
}
