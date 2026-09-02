/**
 * Trigger a browser download for text or binary content. Centralizes the
 * object-URL + anchor dance that was previously copy-pasted across six tools,
 * including the `revokeObjectURL` cleanup.
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mime = "text/plain;charset=utf-8"
): void {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Revoke after a delay — revoking immediately (setTimeout 0) can cancel the
  // download in Firefox for larger blobs.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
