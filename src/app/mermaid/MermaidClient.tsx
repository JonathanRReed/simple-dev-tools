"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Download, Minus, Plus, RotateCcw } from "lucide-react";

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
  {
    label: "ER Diagram",
    code: `erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains\n  CUSTOMER {\n    string name\n    string email\n  }\n  ORDER {\n    int id\n    date created\n  }`,
  },
  {
    label: "Git Graph",
    code: `gitGraph\n  commit\n  branch develop\n  checkout develop\n  commit\n  checkout main\n  merge develop\n  commit`,
  },
  {
    label: "Pie Chart",
    code: `pie title Pets adopted by volunteers\n  "Dogs" : 386\n  "Cats" : 85\n  "Rats" : 15`,
  },
  {
    label: "Mindmap",
    code: `mindmap\n  root((mindmap))\n    Origins\n      Tools\n    Research\n    Uses`,
  },
  {
    label: "User Journey",
    code: `journey\n  title My working day\n  section Go to work\n    Make tea: 5: Me\n    Go upstairs: 3: Me\n  section Do work\n    Code: 5: Me\n    Review: 3: Me`,
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

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

/** Clamp a zoom factor into the supported [ZOOM_MIN, ZOOM_MAX] range. */
function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}

export default function MermaidClient() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [error, setError] = useState<string | null>(null);
  const [mermaid, setMermaid] = useState<MermaidModule["default"] | null>(null);
  const [hasDiagram, setHasDiagram] = useState(false);
  const [zoom, setZoom] = useState(1);
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
      // Disable htmlLabels so flowchart node labels render as native SVG <text>
      // instead of <foreignObject> XHTML. Browsers cannot rasterize
      // <foreignObject> when the SVG is drawn onto a canvas, which otherwise
      // produces blank/unstyled labels in the PNG export (see handleExportPNG).
      mermaidModule.initialize({
        startOnLoad: false,
        htmlLabels: false,
        flowchart: { htmlLabels: false },
      });
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
        // Per-render UNIQUE id (Date.now()) so concurrent/overlapping renders
        // never collide on mermaid's internal temp element. Uniqueness alone
        // doesn't clean up after a draw-time failure — the finally block below
        // removes `d${renderId}`, which is what actually prevents orphan temp
        // nodes from accumulating in the DOM on every failing keystroke.
        const renderId = `mermaid-svg-${Date.now()}`;
        try {
          // Let parse throw its descriptive error (e.g. "Parse error on line 2…")
          // so the Alert shows the actual problem rather than a generic message.
          await mermaid.parse(code);
          if (cancelled) return;
          const { svg } = await mermaid.render(renderId, code);
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
        } finally {
          // mermaid appends a detached container (#d<id>) to the body while
          // rendering and only removes it on success; clean up any orphan it
          // leaves behind on a draw-time failure.
          document.getElementById(`d${renderId}`)?.remove();
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

    // Some diagram types (e.g. User Journey) render their text via XHTML inside
    // <foreignObject>, which browsers refuse to rasterize when the SVG is drawn
    // onto a canvas — producing a PNG with blank labels. Detect it on the live
    // SVG and refuse rather than emit a broken image; SVG export still works.
    if (diagramRef.current?.querySelector("foreignObject")) {
      setError("PNG export isn't supported for this diagram type — use SVG export.");
      return;
    }

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
    img.onerror = function () {
      // Surface the failure via the same Alert used by the render path instead
      // of silently doing nothing when the SVG can't be loaded as an image.
      setError("Could not export PNG: the diagram image failed to load.");
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

  const handleZoomIn = () => setZoom((z) => clampZoom(z + ZOOM_STEP));
  const handleZoomOut = () => setZoom((z) => clampZoom(z - ZOOM_STEP));
  const handleZoomReset = () => setZoom(1);

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
          {hasDiagram ? (
            <div className="mb-2 flex items-center justify-end gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= ZOOM_MIN}
                aria-label="Zoom out"
                title="Zoom out"
              >
                <Minus className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomReset}
                aria-label="Reset zoom"
                title="Reset zoom"
              >
                <span className="font-mono tabular-nums">{Math.round(zoom * 100)}%</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= ZOOM_MAX}
                aria-label="Zoom in"
                title="Zoom in"
              >
                <Plus className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ) : null}
          {/* White canvas (only when a diagram is present) keeps Mermaid's
              default light theme legible on dark app themes and matches the
              white-background PNG export. The zoom transform scales an inner
              wrapper so the outer container stays scrollable when enlarged. */}
          <div
            className={cn(
              "flex w-full flex-1 overflow-auto",
              hasDiagram ? "items-start justify-start bg-white p-3" : "items-center justify-center"
            )}
          >
            <div
              ref={diagramRef}
              role="img"
              aria-label="Rendered Mermaid diagram"
              className="flex w-full flex-1 items-center justify-center [&_svg]:max-w-full"
              style={
                hasDiagram
                  ? { transform: `scale(${zoom})`, transformOrigin: "top left" }
                  : undefined
              }
            />
          </div>
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
