"use client";

import { useCallback, useState } from "react";

/**
 * Releases the Tab key from a code editor so keyboard users are never trapped.
 *
 * `react-simple-code-editor` captures Tab to insert indentation, which is the
 * right behaviour for code but on its own is a WCAG 2.1.2 (No Keyboard Trap,
 * Level A) failure: verified in the browser that both Tab and Shift+Tab came
 * back `defaultPrevented`, so focus could not leave the editor at all.
 *
 * WCAG allows a component to capture Tab as long as the user is told how to
 * get out. This implements the convention Monaco and CodeMirror use: press
 * Escape once, and the next Tab moves focus normally. Any other key restores
 * indentation behaviour, so the escape never sticks around unexpectedly.
 *
 * Callers must surface the "Esc then Tab" affordance in their shortcut list —
 * being told the method is what makes this conformant rather than merely
 * survivable.
 */
export function useTabEscape() {
  const [releaseTab, setReleaseTab] = useState(false);

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setReleaseTab(true);
      return;
    }
    // Let the released Tab through, then immediately re-arm indentation.
    if (event.key === "Tab") {
      if (releaseTab) setReleaseTab(false);
      return;
    }
    if (releaseTab) setReleaseTab(false);
  }, [releaseTab]);

  const onBlur = useCallback(() => setReleaseTab(false), []);

  return {
    /** Pass to react-simple-code-editor's `ignoreTabKey`. */
    ignoreTabKey: releaseTab,
    /** Spread onto the element wrapping the editor. */
    containerProps: { onKeyDown, onBlur },
    /** True while the next Tab will move focus (for an on-screen hint). */
    releaseTab,
  };
}

/** The shortcut entry every editor using this hook should list. */
export const TAB_ESCAPE_SHORTCUT = {
  keys: "Esc then ⇥",
  description: "Move focus out of the editor",
} as const;
