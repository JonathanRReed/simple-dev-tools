/**
 * One-shot handoff between pages of this site.
 *
 * The "paste anything" slot sends content to a tool without putting it in a
 * URL at all: the state waits in sessionStorage, tagged with the destination
 * route, and the destination removes it the moment it reads it. Nothing
 * reaches the address bar, the browser history, or a server. A tool picks it
 * up through `readShareParams` (lib/share), in the same vocabulary as its
 * share links.
 *
 * This module is deliberately dependency-free. It is loaded on every page by
 * the command palette, so it must not pull in the share-link compressor.
 */

export type HandoffParams = Record<string, string>;

const HANDOFF_KEY = "sdt:handoff";
/** A handoff older than this is stale (the navigation never happened). */
const HANDOFF_MAX_AGE_MS = 60_000;
/** Longest uncompressed share link used when sessionStorage is unavailable. */
const MAX_FALLBACK_LINK_LENGTH = 4_000;

const routeKey = (path: string) => (path === "/" ? "/" : path.replace(/\/$/, ""));

/** Queue `params` for the tool at `href`. Returns false if storage is unavailable. */
export function stashHandoff(href: string, params: HandoffParams): boolean {
  try {
    window.sessionStorage.setItem(
      HANDOFF_KEY,
      JSON.stringify({ route: routeKey(href), params, at: Date.now() })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * The handoff is removed from storage on first read, but React's development
 * Strict Mode runs mount effects twice and several hooks may read during one
 * mount. The last read is therefore remembered for a moment, for this route
 * only, so those repeat reads agree with the first.
 */
let lastTaken: { route: string; params: HandoffParams; at: number } | null = null;
const REPEAT_READ_WINDOW_MS = 3_000;

function takeStoredHandoff(here: string): HandoffParams | null {
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(HANDOFF_KEY);
    if (raw === null) return null;
    window.sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return null;
    const { route, params, at } = parsed as { route?: unknown; params?: unknown; at?: unknown };
    if (route !== here) return null;
    if (typeof at !== "number" || Date.now() - at > HANDOFF_MAX_AGE_MS) return null;
    if (params === null || typeof params !== "object") return null;
    const out: HandoffParams = {};
    for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
      if (typeof value === "string") out[key] = value;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Read a pending handoff addressed to this page, ignoring the URL. Tools that
 * deliberately have no share links because their input is a secret (tokens,
 * text to hash) call this directly; everything else goes through
 * `readShareParams`.
 */
export function readHandoff(): HandoffParams | null {
  if (typeof window === "undefined") return null;
  const here = routeKey(window.location.pathname);
  const fresh = takeStoredHandoff(here);
  if (fresh) {
    lastTaken = { route: here, params: fresh, at: Date.now() };
    return fresh;
  }
  if (lastTaken && lastTaken.route === here && Date.now() - lastTaken.at < REPEAT_READ_WINDOW_MS) {
    return lastTaken.params;
  }
  lastTaken = null;
  return null;
}

/**
 * Where to send the browser so the tool at `href` opens with `params`. Prefers
 * the handoff. If sessionStorage is unavailable it falls back to an
 * uncompressed share link when the state is small, and to the bare route when
 * it is not (the tool then opens empty rather than with truncated content).
 */
export function handoffUrl(href: string, params: HandoffParams): string {
  if (stashHandoff(href, params)) return href;
  const raw = new URLSearchParams(params).toString();
  return raw.length > MAX_FALLBACK_LINK_LENGTH ? href : `${href}#s=0:${raw}`;
}
