/**
 * Escape the five HTML-special characters.
 *
 * This exists for one specific job: `react-simple-code-editor` injects its
 * highlighter's return value with `dangerouslySetInnerHTML`, so a highlighter
 * that returns its input unchanged turns every code editor into an HTML
 * injection sink. Prism escapes its own output, but it is loaded lazily — the
 * editor renders (and can already be populated from a `#s=` share link) before
 * that chunk arrives. Every editor's *fallback* highlighter must therefore
 * escape, never pass through.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
