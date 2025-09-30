"use client";
import React, { useState, useRef, useEffect } from "react";
import mermaid from "mermaid";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-markup";
import "prismjs/themes/prism-tomorrow.css";

import ToolPage from '@/components/layout/ToolPage';

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

export default function MermaidPage() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [error, setError] = useState<string | null>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<string | null>(null);

  // Initialize mermaid only once on the client
  useEffect(() => {
    if (typeof window !== "undefined") {
      mermaid.initialize({ startOnLoad: false });
    }
  }, []);

  useEffect(() => {
    if (!diagramRef.current || typeof window === "undefined") return;
    (async () => {
      try {
        mermaid.parse(code); // Validate first
        const { svg } = await mermaid.render("mermaid-svg", code);
        svgRef.current = svg;
        if (diagramRef.current) diagramRef.current.innerHTML = svg;
        setError(null);
      } catch (err: any) {
        setError(err?.message || "Invalid Mermaid syntax");
        if (diagramRef.current) diagramRef.current.innerHTML = "";
        svgRef.current = null;
      }
    })();
  }, [code]);

  // Prism highlight function
  const highlight = (code: string) => Prism.highlight(code, Prism.languages.markup, "markup");

  // Export SVG
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

  // Export PNG
  const handleExportPNG = () => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const img = new window.Image();
    const svg64 = btoa(unescape(encodeURIComponent(svg)));
    const image64 = "data:image/svg+xml;base64," + svg64;
    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "diagram.png";
            a.click();
            URL.revokeObjectURL(url);
          }
        }, "image/png");
      }
    };
    img.src = image64;
  };

  // Handle template selection
  const handleTemplate = (templateCode: string) => {
    setCode(templateCode);
  };

  return (
    <ToolPage contentClassName="mx-auto max-w-5xl">
      <div className="bg-rp-surface/80 rounded-3xl shadow-2xl px-6 sm:px-8 py-8 flex flex-col gap-6 relative border border-rp-highlight-high" style={{backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)'}}>
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-rp-iris drop-shadow">Mermaid Diagram Generator</h2>
          <p className="text-sm text-rp-subtle max-w-3xl">Sketch sequence diagrams, flowcharts, and more. Edit Mermaid syntax on the left and preview instantly on the right.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full justify-start mb-2">
          <select
            className="rounded-xl px-4 py-2 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris"
            onChange={e => handleTemplate(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>Choose a template…</option>
            {TEMPLATES.map(t => (
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
              highlight={highlight}
              padding={12}
              className="rounded-xl bg-rp-surface/70 border border-rp-highlight-high text-rp-text font-mono text-sm min-h-[180px] focus:outline-none focus:ring-2 focus:ring-rp-iris"
              style={{ minHeight: 180, background: "none" }}
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
    </ToolPage>
  );
}
