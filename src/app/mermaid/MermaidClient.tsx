"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const DEFAULT_CODE = `graph TD\n  A[Client] -->|Request| B[API]\n  B -->|Response| A`;
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
    code: `classDiagram\n  Animal <|-- Duck\n  Animal <|-- Fish\n  Animal <|-- Zebra\n  Animal : +int age\n  Animal : +String gender\n  Animal: +isMammal()\n  Animal: +mate()`
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
    <div className="min-h-[180px] rounded-xl border border-rp-highlight-high bg-rp-overlay/50 animate-pulse" />
  ),
});

type MermaidModule = typeof import("mermaid");

type HighlightFn = (code: string) => string;

export default function MermaidClient() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [error, setError] = useState<string | null>(null);
  const [mermaid, setMermaid] = useState<MermaidModule["default"] | null>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<string | null>(null);
  const highlightRef = useRef<HighlightFn>((value: string) => value);
  const [highlightReady, setHighlightReady] = useState(false);

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

  useEffect(() => {
    if (!mermaid || !diagramRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        mermaid.parse(code);
        const { svg } = await mermaid.render(`mermaid-svg-${Date.now()}`, code);
        if (cancelled) return;
        svgRef.current = svg;
        if (diagramRef.current) diagramRef.current.innerHTML = svg;
        setError(null);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Invalid Mermaid syntax");
        if (diagramRef.current) diagramRef.current.innerHTML = "";
        svgRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, mermaid]);

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
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const img = new window.Image();
    const svg64 = window.btoa(unescape(encodeURIComponent(svg)));
    const image64 = "data:image/svg+xml;base64," + svg64;
    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
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

  const handleTemplate = (templateCode: string) => {
    setCode(templateCode);
  };

  return (
    <div className="bg-rp-surface/80 rounded-3xl shadow-2xl px-6 sm:px-8 py-8 flex flex-col gap-6 relative border border-rp-highlight-high" style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-rp-iris drop-shadow">Mermaid Diagram Generator</h1>
        <p className="text-sm text-rp-subtle max-w-3xl">Sketch sequence diagrams, flowcharts, and more. Edit Mermaid syntax on the left and preview instantly on the right.</p>
      </div>
      <div className="flex flex-wrap gap-3 w-full justify-start mb-2">
        <select
          className="rounded-xl px-4 py-2 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris"
          onChange={(e) => handleTemplate(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Choose a template…</option>
          {TEMPLATES.map((t) => (
            <option key={t.label} value={t.code}>{t.label}</option>
          ))}
        </select>
        <button
          className="px-4 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80 font-semibold shadow hover:bg-rp-overlay/60 transition"
          onClick={handleExportSVG}
        >
          Export SVG
        </button>
        <button
          className="px-4 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80 font-semibold shadow hover:bg-rp-overlay/60 transition"
          onClick={handleExportPNG}
        >
          Export PNG
        </button>
        <button
          className="px-4 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80 font-semibold shadow hover:bg-rp-overlay/60 transition"
          onClick={() => navigator.clipboard.writeText(code)}
        >
          Copy Mermaid Code
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]">
        <div className="flex flex-col gap-3 min-w-[280px]">
          <Editor
            value={code}
            onValueChange={setCode}
            highlight={(value) => highlightRef.current(value)}
            padding={12}
            className="rounded-xl bg-rp-surface/70 border border-rp-highlight-high text-rp-text font-mono text-sm min-h-[180px] focus:outline-none focus:ring-2 focus:ring-rp-iris"
            style={{ minHeight: 180, background: "none", opacity: highlightReady ? 1 : 0.85 }}
            textareaId="mermaid-editor"
            textareaClassName="hidden"
            spellCheck={false}
          />
        </div>
        <div className="min-w-[280px] rounded-xl border border-rp-highlight-high bg-rp-overlay/70 p-4 min-h-[180px] flex flex-col gap-3">
          <div ref={diagramRef} className="w-full flex-1 overflow-auto" />
          {error && <div className="text-rp-love text-xs">{error}</div>}
        </div>
      </div>
    </div>
  );
}
