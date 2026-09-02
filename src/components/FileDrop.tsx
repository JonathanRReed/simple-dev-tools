"use client";

import * as React from "react";
import { Upload } from "lucide-react";

import { cn } from "@/lib/utils";

export interface FileDropProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrop" | "children"> {
  /** Called with the file's text content once a dropped file is read. */
  onFileText: (text: string, file: File) => void;
  /** Restrict accepted files (e.g. ".json,.yaml,.yml,text/csv"). */
  accept?: string;
  /** Accessible label for the drop zone and its import control. */
  label?: string;
  children: React.ReactNode;
}

/**
 * Wraps tool input areas with drag-and-drop file import. Reads the dropped
 * file as text and hands it to the tool. Keyboard users get a real, focusable
 * Import button (which forwards to the hidden file input); drag state and
 * read errors are announced via a polite live region.
 */
const FileDrop = React.forwardRef<HTMLDivElement, FileDropProps>(
  ({ onFileText, accept, label = "Import file", className, children, ...props }, ref) => {
    const [dragging, setDragging] = React.useState(false);
    const [readError, setReadError] = React.useState(false);
    const depth = React.useRef(0);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const inputId = React.useId();

    const readAndEmit = React.useCallback(
      async (file: File) => {
        try {
          const text = await file.text();
          setReadError(false);
          onFileText(text, file);
        } catch {
          setReadError(true);
        }
      },
      [onFileText]
    );

    const onDragEnter = (event: React.DragEvent) => {
      event.preventDefault();
      depth.current += 1;
      setDragging(true);
    };
    const onDragLeave = (event: React.DragEvent) => {
      event.preventDefault();
      depth.current -= 1;
      if (depth.current <= 0) {
        depth.current = 0;
        setDragging(false);
      }
    };
    const onDragOver = (event: React.DragEvent) => event.preventDefault();
    const onDrop = (event: React.DragEvent) => {
      event.preventDefault();
      depth.current = 0;
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) void readAndEmit(file);
    };

    return (
      <div
        ref={ref}
        className={cn("group relative", className)}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        {...props}
      >
        {children}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readAndEmit(file);
            event.target.value = "";
          }}
        />
        {dragging || readError ? (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-rp-iris bg-background/80"
            role="status"
            aria-live="polite"
          >
            <span className="brutal-label flex items-center gap-2 text-foreground">
              <Upload className="size-4" aria-hidden="true" />
              {dragging ? "Drop file to import" : "Could not read that file"}
            </span>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute right-2 top-2 z-0 inline-flex items-center gap-1 border border-border bg-background px-1.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground opacity-0 transition-opacity hover:border-primary hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:border-primary group-hover:opacity-100"
        >
          <Upload className="size-3" aria-hidden="true" />
          {label}
        </button>
      </div>
    );
  }
);
FileDrop.displayName = "FileDrop";

export { FileDrop };
