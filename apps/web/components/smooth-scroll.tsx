"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/** Inertial wheel scrolling for marketing pages. Skipped when the visitor prefers reduced motion. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      // In-page nav links glide too; sections' scroll-mt already clears the sticky header.
      anchors: true,
    });
    return () => lenis.destroy();
  }, []);

  return null;
}
