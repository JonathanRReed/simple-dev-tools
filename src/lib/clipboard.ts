/**
 * Copy text to the clipboard, falling back to a hidden textarea when the async
 * Clipboard API is unavailable or rejects (file://, plain http on a non-local
 * host, or a permission denial).
 *
 * The Timestamp and Color tools each carried a byte-identical private copy of
 * this; components should prefer `<CopyButton>`, which also handles the
 * confirmation state. This is for the cases that need the bare promise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
