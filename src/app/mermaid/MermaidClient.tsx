"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Download, RotateCcw } from "lucide-react";

import ToolShell from "@/components/tool/ToolShell";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { ResultPanel } from "@/components/ui/result-panel";
import { cn } from "@/lib/utils";

const DEFAULT_CODE = `graph TD\n  A[Client] -->|Request| B[API]\n  B -->|Response| A`;
const STORAGE_KEY = "mermaid-editor-code";

const TEMPLATES = [
  {
    label: "Flowchart",
    code: `graph TD\n  Start --> Stop`,
  },
  {
    label: "Sequence Diagram",
    code: `sequenceDiagram\n  participant Alice\n  participant Bob\n  Alice->>Bob: Hello Bob, how are you?\n  Bob-->>Alice: I am good thanks!`,
  },
  {
    label: "Class Diagram",
    code: `classDiagram\n  Animal <|-- Duck\n  Animal <|-- Fish\n  Animal <|-- Zebra\n  Animal : +int age\n  Animal : +String gender\n  Animal: +isMammal()\n  Animal: +mate()`,
  },
  {
    label: "State Diagram",
    code: `stateDiagram-v2\n  [*] --> Still\n  Still --> [*]\n  Still --> Moving\n  Moving --> Still`,
  },
  {
    label: "Gantt Chart",
    code: `gantt\n  title A Gantt Diagram\n  dateFormat  YYYY-MM-DD\n  section Section\n  A task           :a1, 2022-01-01, 30d\n  Another task     :after a1  , 20d`,
  },
];

const Editor = dynamic(() => import("react-simple-code-editor"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[180px] border-2 border-border bg-background animate-pulse" />
  ),
});

type MermaidModule = typeof import("mermaid");

type HighlightFn = (code: string) => string;

/** Parse width/height out of an SVG's viewBox attribute as a dimensions fallback. */
function viewBoxDimensions(svg: string): { width: number; height: number } | null {
  const match = svg.match(/viewBox\s*=\s*["']\s*[\d.+-]+\s+[\d.+-]+\s+([\d.+-]+)\s+([\d.+-]+)/i);
  if (!match) return null;
  const width = parseFloat(match[1]);
  const height = parseFloat(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

export default function MermaidClient() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [error, setError] = useState<string | null>(null);
  const [mermaid, setMermaid] = useState<MermaidModule["default"] | null>(null);
  const [hasDiagram, setHasDiagram] = useState(false);
  const diagramRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<string | null>(null);
  const highlightRef = useRef<HighlightFn>((value: string) => value);
  const [highlightReady, setHighlightReady] = useState(false);

  // Restore any previously edited code from localStorage on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved != null && saved.length > 0) setCode(saved);
    } catch {
      // ignore storage access errors (private mode, etc.)
    }
  }, []);

  // Persist code to localStorage as it changes.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore storage access errors
    }
  }, [code]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ default: mermaidModule }] = await Promise.all([
        import("mermaid"),
      ]);
      if (cancelled) return;
      mermaidModule.initialize({ startOnLoad: false });
      setMermaid(mermaidModule);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const prismModule = await import("prismjs");
      await Promise.all([
        import("prismjs/components/prism-markup"),
        import("prismjs/components/prism-javascript"),
        import("prismjs/themes/prism-tomorrow.css"),
      ]);
      if (cancelled) return;
      const Prism = prismModule.default ?? prismModule;
      highlightRef.current = (value: string) => Prism.highlight(value, Prism.languages.markup, "markup");
      setHighlightReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced render: avoids re-rendering and flashing on every keystroke.
  useEffect(() => {
    if (!mermaid || !diagramRef.current) return;
    let cancelled = false;

    const timer = setTimeout(() => {
      (async () => {
        try {
          // Let parse throw its descriptive error (e.g. "Parse error on line 2…")
          // so the Alert shows the actual problem rather than a generic message.
          await mermaid.parse(code);
          if (cancelled) return;
          const { svg } = await mermaid.render(`mermaid-svg-${Date.now()}`, code);
          if (cancelled) return;
          svgRef.current = svg;
          if (diagramRef.current) diagramRef.current.innerHTML = svg;
          setError(null);
          setHasDiagram(true);
        } catch (err) {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Invalid Mermaid syntax");
          if (diagramRef.current) diagramRef.current.innerHTML = "";
          svgRef.current = null;
          setHasDiagram(false);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, mermaid]);

  const canExport = hasDiagram && !error && svgRef.current != null;

  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const blob = new Blob([svgRef.current], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    const svg = svgRef.current;
    if (!svg) return;

    // Determine real diagram dimensions. SVGs rendered by mermaid often have no
    // intrinsic width/height, so img.width/height would be 0 and produce a blank
    // PNG. Read the live <svg> element's measured size, falling back to the
    // viewBox parsed from the markup.
    const scale = 2;
    const liveSvg = diagramRef.current?.querySelector("svg");
    let width = 0;
    let height = 0;
    if (liveSvg) {
      const rect = liveSvg.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    }
    if (!width || !height) {
      const fromViewBox = viewBoxDimensions(svg);
      if (fromViewBox) {
        width = fromViewBox.width;
        height = fromViewBox.height;
      }
    }
    if (!width || !height) {
      width = 800;
      height = 600;
    }

    const img = new window.Image();
    const svg64 = window.btoa(unescape(encodeURIComponent(svg)));
    const image64 = "data:image/svg+xml;base64," + svg64;
    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // White background so the diagram is legible in viewers that assume opaque.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "diagram.png";
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = image64;
  };

  const handleTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) setCode(value);
    // Reset back to the placeholder so re-selecting the same template re-applies.
    e.target.value = "";
  };

  const handleReset = () => {
    setCode(DEFAULT_CODE);
  };

  const toolbar = (
    <>
      <select
        aria-label="Insert a diagram template"
        className="h-8 border-2 border-input bg-background px-3 font-mono text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onChange={handleTemplate}
        value=""
      >
        <option value="" disabled>
          Template…
        </option>
        {TEMPLATES.map((t) => (
          <option key={t.label} value={t.code}>
            {t.label}
          </option>
        ))}
      </select>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportSVG}
        disabled={!canExport}
      >
        <Download className="size-4" aria-hidden="true" />
        SVG
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPNG}
        disabled={!canExport}
      >
        <Download className="size-4" aria-hidden="true" />
        PNG
      </Button>
      <CopyButton value={() => code} label="Copy code" size="sm" />
      <Button variant="ghost" size="sm" onClick={handleReset}>
        <RotateCcw className="size-4" aria-hidden="true" />
        Reset
      </Button>
    </>
  );

  return (
    <ToolShell eyebrow="Mermaid editor" toolbar={toolbar}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="mermaid-editor">Mermaid source</Label>
          <Editor
            value={code}
            onValueChange={setCode}
            highlight={(value) => highlightRef.current(value)}
            padding={12}
            className="min-h-[260px] border-2 border-border bg-background font-mono text-sm text-foreground focus-within:ring-2 focus-within:ring-ring"
            style={{ minHeight: 260, background: "none", opacity: highlightReady ? 1 : 0.85 }}
            textareaId="mermaid-editor"
            spellCheck={false}
          />
          {error ? <Alert variant="error">{error}</Alert> : null}
        </div>
        <ResultPanel
          title="Preview"
          className="min-w-0"
          bodyClassName="min-h-[260px]"
        >
          {/* White canvas (only when a diagram is present) keeps Mermaid's
              default light theme legible on dark app themes and matches the
              white-background PNG export. */}
          <div
            ref={diagramRef}
            role="img"
            aria-label="Rendered Mermaid diagram"
            aria-live="polite"
            className={cn(
              "flex w-full flex-1 items-center justify-center overflow-auto [&_svg]:max-w-full",
              hasDiagram && "bg-white p-3"
            )}
          />
          {!hasDiagram && !error ? (
            <p className="mt-3 text-center font-mono text-sm text-muted-foreground">
              A valid diagram renders here.
            </p>
          ) : null}
        </ResultPanel>
      </div>
    </ToolShell>
  );
}
