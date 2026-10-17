"use client";

import { useEffect, useRef } from "react";

// 4×4 Bayer matrix: a cell is lit when the local intensity beats its threshold,
// so a smooth falloff renders as an ordered-dither pixel pattern.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));

const CELL = 4; // px per dither cell
const RADIUS = 260; // px reach of the glow around the cursor

/**
 * A pixel-dither glow that trails the mouse across its parent element, with rings rolling outward.
 * Colour comes from the canvas's CSS `color` (e.g. text-brand), so it follows the theme.
 * Mouse only: touch and reduced-motion visitors get nothing. Draws only while the glow is visible.
 */
export function CursorDither({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    // Target position, smoothed position, and a 0–1 strength that eases in and out.
    const p = { x: 0, y: 0, sx: 0, sy: 0, target: 0, amt: 0 };
    let width = 0;
    let height = 0;
    let frame: number | null = null;
    let color = "";

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time: number) => {
      p.sx += (p.x - p.sx) * 0.12;
      p.sy += (p.y - p.sy) * 0.12;
      p.amt += (p.target - p.amt) * 0.08;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;

      // Only visit cells inside the glow's bounding box.
      const c0 = Math.max(0, Math.floor((p.sx - RADIUS) / CELL));
      const c1 = Math.min(Math.ceil(width / CELL), Math.ceil((p.sx + RADIUS) / CELL));
      const r0 = Math.max(0, Math.floor((p.sy - RADIUS) / CELL));
      const r1 = Math.min(Math.ceil(height / CELL), Math.ceil((p.sy + RADIUS) / CELL));

      for (let r = r0; r < r1; r += 1) {
        for (let c = c0; c < c1; c += 1) {
          const dist = Math.hypot(c * CELL + CELL / 2 - p.sx, r * CELL + CELL / 2 - p.sy);
          if (dist >= RADIUS) continue;
          const f = 1 - dist / RADIUS;
          const ring = 0.5 + 0.5 * Math.sin(dist * 0.045 - time * 0.004);
          const intensity = f * f * (3 - 2 * f) * p.amt * (0.55 + 0.45 * ring);
          if (BAYER[r % 4]![c % 4]! < intensity) ctx.fillRect(c * CELL, r * CELL, CELL - 1, CELL - 1);
        }
      }

      frame = p.target > 0 || p.amt > 0.005 ? requestAnimationFrame(draw) : null;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = canvas.getBoundingClientRect();
      p.x = event.clientX - rect.left;
      p.y = event.clientY - rect.top;
      if (p.target === 0) {
        // Re-read the colour on each entry so a theme switch is picked up.
        color = getComputedStyle(canvas).color;
        // Start from the cursor instead of sliding in from the last spot.
        if (p.amt < 0.01) {
          p.sx = p.x;
          p.sy = p.y;
        }
      }
      p.target = 1;
      frame ??= requestAnimationFrame(draw);
    };
    const onLeave = () => {
      p.target = 0;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);

    return () => {
      observer.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
