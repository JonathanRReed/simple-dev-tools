import { useSyncExternalStore } from "react";

/**
 * The label for the platform's shortcut modifier: "⌘" on Apple devices,
 * "Ctrl" everywhere else. Shortcuts are written with ⌘ in the source; this
 * is what turns them into something a Windows or Linux keyboard actually has.
 *
 * The server render and first client render use ⌘, then non-Apple platforms
 * switch after hydration, so the markup always matches.
 */
function isApplePlatform(): boolean {
  const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  const platform = data?.platform ?? navigator.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

const subscribe = () => () => {};

export function useModKey(): "⌘" | "Ctrl" {
  return useSyncExternalStore(
    subscribe,
    () => (isApplePlatform() ? "⌘" : "Ctrl"),
    () => "⌘"
  );
}

/** Rewrite a displayed combo such as "⌘ ↵" for the current platform. */
export function formatKeys(keys: string, mod: "⌘" | "Ctrl"): string {
  return mod === "⌘" ? keys : keys.replace(/⌘/g, "Ctrl");
}
