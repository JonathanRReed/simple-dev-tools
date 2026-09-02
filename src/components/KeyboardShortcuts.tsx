"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Keyboard } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface ToolShortcut {
  /** Key combo as displayed, e.g. "⌘ ↵" or "Shift ↵". */
  keys: string;
  /** What the shortcut does, e.g. "Run query". */
  description: string;
}

export interface KeyboardShortcutsDialogProps {
  shortcuts: ToolShortcut[];
}

/**
 * Shortcut help dialog for a tool. Rendered by ToolShell when the tool
 * declares `shortcuts`; the tool itself binds the actual keys via useHotkey.
 */
export function KeyboardShortcutsDialog({ shortcuts }: KeyboardShortcutsDialogProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts"
        >
          <Keyboard className="size-4" aria-hidden="true" />
          <span className="sr-only">Keyboard shortcuts</span>
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[18%] z-50 w-[92vw] max-w-md -translate-x-1/2 border-2 border-border bg-popover shadow-hard-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        >
          <DialogPrimitive.Title className="brutal-label border-b-2 border-border px-4 py-2.5">
            Keyboard shortcuts
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Keyboard shortcuts available in this tool.
          </DialogPrimitive.Description>
          <ul className="flex flex-col px-4 py-3">
            {shortcuts.map((shortcut) => (
              <li
                key={shortcut.keys}
                className="flex items-center justify-between gap-4 py-1.5 text-sm"
              >
                <span className="text-muted-foreground">{shortcut.description}</span>
                <kbd className="shrink-0 border border-border bg-background px-2 py-0.5 font-mono text-xs text-foreground">
                  {shortcut.keys}
                </kbd>
              </li>
            ))}
            <li className="flex items-center justify-between gap-4 py-1.5 text-sm">
              <span className="text-muted-foreground">Open command palette</span>
              <kbd className="shrink-0 border border-border bg-background px-2 py-0.5 font-mono text-xs text-foreground">
                ⌘ K
              </kbd>
            </li>
          </ul>
          <div className="flex justify-end border-t-2 border-border px-4 py-2.5">
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="secondary" size="sm">
                Close
              </Button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
