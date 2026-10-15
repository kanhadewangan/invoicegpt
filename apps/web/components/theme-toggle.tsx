"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const ORDER: Theme[] = ["system", "light", "dark"];
const ICONS = { system: Monitor, light: Sun, dark: Moon };

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = document.documentElement.dataset.theme;
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]!;
    setTheme(next);
    const root = document.documentElement;
    try {
      if (next === "system") {
        delete root.dataset.theme;
        localStorage.removeItem("theme");
      } else {
        root.dataset.theme = next;
        localStorage.setItem("theme", next);
      }
    } catch {
      // Storage can be blocked (private mode); the theme still applies for this visit.
    }
  }

  const Icon = ICONS[theme];
  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${theme}`}
      aria-label={`Theme: ${theme}. Click to change.`}
      className={`grid size-9 place-items-center rounded-lg text-muted transition hover:bg-subtle hover:text-fg ${className}`}
    >
      <Icon key={theme} className="size-4 animate-pop" />
    </button>
  );
}
