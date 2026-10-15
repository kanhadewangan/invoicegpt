"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-renders the page's server data on an interval while the tab is visible, so a payment
 * that arrives via the PayPal webhook shows up as "Paid" without a manual reload.
 */
export function AutoRefresh({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);

  return null;
}
