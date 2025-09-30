"use client";
import { useEffect, useState } from "react";

const THEMES = ["main", "moon", "dawn"] as const;
type Theme = typeof THEMES[number];

function labelFor(theme: Theme) {
  switch (theme) {
    case "main":
      return "Rosé Pine";
    case "moon":
      return "Moon";
    case "dawn":
      return "Dawn";
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("main");

  // Initialize state from storage or media query
  useEffect(() => {
    try {
      const stored = localStorage.getItem("rp-theme") as Theme | null;
      if (stored && (THEMES as readonly string[]).includes(stored)) {
        setTheme(stored);
        return;
      }
    } catch {}
    // Fallback to prefers-color-scheme
    const prefersLight = typeof window !== "undefined" && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    setTheme(prefersLight ? "dawn" : "main");
  }, []);

  // Apply selection
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("rp-theme", theme); } catch {}
  }, [theme]);

  return (
    <div className="inline-flex items-center gap-0 rounded-xl bg-rp-surface/80 border border-rp-highlight-high p-1 backdrop-blur">
      {THEMES.map((t) => {
        const active = t === theme;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(t)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rp-iris ${
              active ? 'bg-rp-overlay text-rp-text' : 'text-rp-subtle hover:text-rp-text hover:bg-rp-highlight-low'
            }`}
            title={labelFor(t)}
          >
            {labelFor(t)}
          </button>
        );
      })}
    </div>
  );
}
