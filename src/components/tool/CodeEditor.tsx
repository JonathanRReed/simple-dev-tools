"use client";

import { useMemo } from "react";
import CodeMirror, { EditorView, type Extension } from "@uiw/react-codemirror";
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { sql, SQLite } from "@codemirror/lang-sql";
import { tags as t } from "@lezer/highlight";
import { useTheme } from "next-themes";

import { getAppTheme } from "@/lib/themes";

/**
 * The shared code editor.
 *
 * Replaces `react-simple-code-editor` + Prism, which had no line numbers (both
 * the SQLite and Mermaid tools report line-referenced errors, with no lines on
 * screen to count), no bracket matching, no find/replace, an undo stack that
 * lost externally-set content, and a `dangerouslySetInnerHTML` highlight layer
 * that was an HTML injection sink when its highlighter had not loaded yet.
 *
 * Colours come from the same contrast-checked --code-* variables the old Prism
 * ruleset used, so highlighting still follows all six themes and stays covered
 * by theme-contrast.test.ts.
 */

const syntax = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--code-comment)", fontStyle: "italic" },
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword], color: "var(--code-keyword)" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "var(--code-string)" },
  { tag: [t.number, t.bool, t.null, t.integer, t.float], color: "var(--code-number)" },
  { tag: [t.operator, t.compareOperator, t.logicOperator, t.arithmeticOperator], color: "var(--code-operator)" },
  { tag: [t.function(t.variableName), t.className, t.definition(t.variableName)], color: "var(--code-function)" },
  { tag: [t.tagName, t.propertyName, t.attributeName, t.typeName], color: "var(--code-tag)" },
  { tag: [t.punctuation, t.separator, t.bracket], color: "var(--code-punctuation)" },
  { tag: [t.invalid], color: "hsl(var(--destructive))" },
]);

/**
 * Mermaid has no CodeMirror grammar. This is a deliberately small tokenizer for
 * the parts that matter — it is still a strict improvement on what it replaces,
 * which pointed Prism's HTML grammar at Mermaid source and produced almost no
 * tokens at all.
 */
const mermaidLanguage = StreamLanguage.define<{ inString: boolean }>({
  startState: () => ({ inString: false }),
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(/%%.*/)) return "comment";
    if (stream.match(/"(?:[^"\\]|\\.)*"?/)) return "string";
    if (
      stream.match(
        /\b(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|subgraph|end|participant|actor|note|loop|alt|else|opt|par|and|rect|activate|deactivate|class|click|style|linkStyle|classDef|direction|title|section|dateFormat|axisFormat)\b/
      )
    ) {
      return "keyword";
    }
    if (stream.match(/(?:-{1,3}[->.ox|]+|={1,3}[=>]|:{1,3}|<\|?--|--\|?>)/)) return "operator";
    if (stream.match(/\b\d+(?:\.\d+)?\b/)) return "number";
    if (stream.match(/\b(?:TB|TD|BT|RL|LR)\b/)) return "atom";
    stream.next();
    return null;
  },
});

export type CodeLanguage = "sql" | "mermaid" | "plain";

/** Themes whose --rp-base is light; CodeMirror needs this for its own defaults. */
const LIGHT_THEMES = new Set(["dawn", "paper"]);

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: CodeLanguage;
  /** id applied to the editable element, so an external <Label> can point at it. */
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
  minHeight?: number;
  readOnly?: boolean;
}

export default function CodeEditor({
  value,
  onChange,
  language = "plain",
  id,
  ariaLabel,
  placeholder,
  minHeight = 240,
  readOnly = false,
}: CodeEditorProps) {
  const { theme, resolvedTheme } = useTheme();
  const active = (theme === "system" ? resolvedTheme : theme) ?? resolvedTheme ?? "art-deco";
  const isLight = LIGHT_THEMES.has(getAppTheme(active)?.id ?? active);

  // Passed as the `theme` prop, not an extension: @uiw/react-codemirror applies
  // its own light theme by default, and an extension does not displace it —
  // which left the editor painting a white background under near-white text at
  // 1.12:1. The prop replaces it outright.
  const editorTheme = useMemo(
    () =>
      EditorView.theme(
        {
          "&": {
            backgroundColor: "transparent",
            color: "hsl(var(--foreground))",
            fontSize: "0.875rem",
          },
          ".cm-scroller": { backgroundColor: "transparent", lineHeight: "1.6" },
          "&.cm-focused": { outline: "none" },
          ".cm-content": {
            fontFamily: "var(--font-mono)",
            caretColor: "var(--rp-iris)",
            padding: "12px 0",
          },
          ".cm-gutters": {
            backgroundColor: "transparent",
            color: "var(--code-comment)",
            border: "none",
            borderRight: "2px solid hsl(var(--border))",
            fontFamily: "var(--font-mono)",
          },
          ".cm-activeLine": { backgroundColor: "hsl(var(--foreground) / 0.055)" },
          ".cm-activeLineGutter": {
            backgroundColor: "transparent",
            color: "hsl(var(--foreground))",
          },
          ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--rp-iris)" },
          "&.cm-focused .cm-matchingBracket": {
            backgroundColor: "hsl(var(--primary) / 0.25)",
            outline: "1px solid hsl(var(--primary))",
          },
          ".cm-selectionBackground, ::selection": {
            backgroundColor: "hsl(var(--primary) / 0.28)",
          },
          "&.cm-focused .cm-selectionBackground": {
            backgroundColor: "hsl(var(--primary) / 0.35)",
          },
          ".cm-panels": {
            backgroundColor: "hsl(var(--card))",
            color: "hsl(var(--foreground))",
            border: "2px solid hsl(var(--border))",
          },
          ".cm-searchMatch": { backgroundColor: "var(--code-number)", color: "hsl(var(--background))" },
          ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "var(--code-operator)" },
          ".cm-placeholder": { color: "hsl(var(--muted-foreground))" },
        },
        { dark: !isLight }
      ),
    [isLight]
  );

  const extensions = useMemo<Extension[]>(() => {
    const list: Extension[] = [syntaxHighlighting(syntax), EditorView.lineWrapping];
    if (language === "sql") list.push(sql({ dialect: SQLite }));
    if (language === "mermaid") list.push(mermaidLanguage);
    return list;
  }, [language]);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={editorTheme}
      readOnly={readOnly}
      placeholder={placeholder}
      minHeight={`${minHeight}px`}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        history: true,
        searchKeymap: true,
        foldGutter: false,
        autocompletion: language === "sql",
        // Left off on purpose: binding Tab to indent traps keyboard users in
        // the editor (WCAG 2.1.2). Without it Tab moves focus, and Mod-] /
        // Mod-[ still indent and dedent.
        indentOnInput: true,
      }}
      // CodeMirror renders its own editable div; hand the id to it so the
      // tool's <Label htmlFor> keeps pointing at the right element.
      id={id}
      aria-label={ariaLabel}
      className="w-full"
    />
  );
}
