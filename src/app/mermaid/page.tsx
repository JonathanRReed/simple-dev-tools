"use client";
import React, { useState, useRef, useEffect } from "react";
import mermaid from "mermaid";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-markup";
import "prismjs/themes/prism-tomorrow.css";

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
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-8">
      <div className="bg-rp-surface/80 rounded-3xl shadow-2xl px-8 py-10 max-w-3xl w-full flex flex-col items-center gap-6 relative border border-rp-highlight-high" style={{backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)'}}>
        <h2 className="text-3xl font-bold text-rp-iris mb-2 text-center drop-shadow">Mermaid Diagram Generator</h2>
        <div className="flex flex-wrap gap-3 w-full justify-center mb-2">
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
        <div className="w-full flex flex-col md:flex-row gap-6">
          <div className="flex-1">
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
          <div className="flex-1 bg-rp-overlay/70 border border-rp-highlight-high rounded-xl p-4 min-h-[180px] flex flex-col items-center justify-center relative">
            <div ref={diagramRef} className="w-full overflow-auto" />
            {error && <div className="text-rp-love text-xs mt-2">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
