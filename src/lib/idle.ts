/**
 * Run `task` once the browser has nothing more urgent to do, or after
 * `timeout` at the latest. Used to fetch code that is not needed to paint or
 * hydrate a page (the command palette, the theme menu, the mobile drawer), so
 * it is ready by the time someone reaches for it without competing with the
 * page's own work. Returns a function that cancels the request.
 */
export function whenIdle(task: () => void, timeout = 4000): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(task, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const timer = window.setTimeout(task, 1500);
  return () => window.clearTimeout(timer);
}
