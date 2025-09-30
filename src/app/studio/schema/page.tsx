"use client";
import React, { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import YAML from "yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";

import ToolPage from "@/components/layout/ToolPage";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

function parseInput(source: string, format: "json" | "yaml") {
  try {
    let value: any;
    if (format === "json") {
      value = JSON.parse(source);
    } else {
      value = YAML.parse(source);
    }
    const isOpenAPI = !!(
      value &&
      (typeof (value as any).openapi === "string" || (value as any).swagger === "2.0")
    );
    return { value, error: null, isOpenAPI };
  } catch (e: any) {
    return { value: null, error: e?.message || "Failed to parse", isOpenAPI: false };
  }
}

export default function SchemaStudio() {
  const [tab, setTab] = useState<"source" | "docs" | "validate" | "types">("source");
  const [format, setFormat] = useState<"json" | "yaml">("yaml");
  const [source, setSource] = useState<string>(
    `openapi: 3.0.3\ninfo:\n  title: Sample API\n  version: 1.0.0\npaths:\n  /hello:\n    get:\n      responses:\n        '200':\n          description: OK\n`
  );
  const [importUrl, setImportUrl] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Types tab state
  const [typesMode, setTypesMode] = useState<"ts" | "zod">("ts");
  const [schemaInput, setSchemaInput] = useState<string>(
    '{"type":"object","properties":{"name":{"type":"string"}},"required":["name"]}'
  );
  const [typesOutput, setTypesOutput] = useState<string>("");
  const [typesError, setTypesError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [typesCopied, setTypesCopied] = useState(false);

  const parsed = useMemo(() => parseInput(source, format), [source, format]);

  // Simple Ajv validator (schema + data JSON)
  const [schemaText, setSchemaText] = useState<string>(
    '{"type":"object","properties":{"name":{"type":"string"}},"required":["name"]}'
  );
  const [dataText, setDataText] = useState<string>('{"name":"Alice"}');

  const ajv = useMemo(() => {
    const a = new Ajv({ allErrors: true });
    addFormats(a);
    return a;
  }, []);

  // Emit 'interface' only when the generated type is an object literal; otherwise emit a 'type' alias.
  const emitTsDeclaration = useCallback((name: string, typeExpr: string) => {
    const trimmed = (typeExpr || "").trim();
    if (trimmed.startsWith("{")) return `export interface ${name} ${trimmed}`;
    return `export type ${name} = ${trimmed}`;
  }, []);

  const validateResult = useMemo(() => {
    try {
      const schema = JSON.parse(schemaText);
      const data = JSON.parse(dataText);
      const validate = ajv.compile(schema);
      const valid = validate(data);
      return {
        ok: !!valid,
        errors: validate.errors || null,
      };
    } catch (e: any) {
      return { ok: false, errors: [{ message: e?.message || "Invalid JSON" }] } as any;
    }
  }, [schemaText, dataText, ajv]);

  // --- JSON Schema helpers ----
  type JSONSchema = any;

  const isLikelyJsonSchema = useCallback((obj: any): boolean => {
    if (!obj || typeof obj !== "object") return false;
    if (obj.$schema || obj.properties || obj.type || obj.$defs || obj.definitions) return true;
    return false;
  }, []);

  const tsTypeFromSchema = useCallback((schema: JSONSchema): string => {
    if (!schema || typeof schema !== "object") return "any";
    if (schema.$ref && typeof schema.$ref === "string") {
      const ref = schema.$ref.split("/").pop() || "Ref";
      return ref;
    }
    if (schema.enum && Array.isArray(schema.enum)) {
      return schema.enum.map((v: any) => (typeof v === "string" ? JSON.stringify(v) : String(v))).join(" | ");
    }
    const t = schema.type;
    if (Array.isArray(t)) {
      return t.map((tt) => tsTypeFromSchema({ ...schema, type: tt })).join(" | ");
    }
    switch (t) {
      case "string":
        return "string";
      case "number":
      case "integer":
        return "number";
      case "boolean":
        return "boolean";
      case "null":
        return "null";
      case "array":
        return `${tsTypeFromSchema(schema.items || {})}[]`;
      case "object": {
        const props = schema.properties || {};
        const required: string[] = schema.required || [];
        const entries = Object.entries(props).map(([k, v]: [string, any]) => {
          const optional = required.includes(k) ? "" : "?";
          return `  ${JSON.stringify(k)}${optional}: ${tsTypeFromSchema(v)};`;
        });
        const allowAdditional = schema.additionalProperties;
        if (allowAdditional) {
          const ap = allowAdditional === true ? "any" : tsTypeFromSchema(allowAdditional);
          entries.push(`  [k: string]: ${ap};`);
        }
        return `{\n${entries.join("\n")}\n}`;
      }
      default: {
        if (schema.anyOf) return (schema.anyOf as any[]).map(tsTypeFromSchema).join(" | ");
        if (schema.oneOf) return (schema.oneOf as any[]).map(tsTypeFromSchema).join(" | ");
        if (schema.allOf) return (schema.allOf as any[]).map(tsTypeFromSchema).join(" & ");
        return "any";
      }
    }
  }, []);

  const collectNamedDefs = useCallback((root: JSONSchema): Record<string, any> => {
    const defs = { ...(root?.definitions || {}), ...(root?.$defs || {}) } as Record<string, any>;
    return defs;
  }, []);

  const generateTypesFromJsonSchema = useCallback((schema: JSONSchema, rootName = "Root"): string => {
    const defs = collectNamedDefs(schema);
    const defBlocks = Object.entries(defs).map(([name, def]) => emitTsDeclaration(String(name), tsTypeFromSchema(def)));
    const rootBlock = emitTsDeclaration(rootName, tsTypeFromSchema(schema));
    return [...defBlocks, rootBlock].join("\n\n");
  }, [collectNamedDefs, tsTypeFromSchema, emitTsDeclaration]);

  const zodFromSchema = useCallback((schema: JSONSchema): string => {
    if (!schema || typeof schema !== "object") return "z.any()";
    if (schema.$ref && typeof schema.$ref === "string") {
      const ref = schema.$ref.split("/").pop() || "Ref";
      return `${ref}Schema`;
    }
    if (schema.enum && Array.isArray(schema.enum)) {
      const allStrings = schema.enum.every((v: any) => typeof v === "string");
      if (allStrings) return `z.enum([${schema.enum.map((v: any) => JSON.stringify(v)).join(", ")}])`;
      return `z.union([${schema.enum.map((v: any) => `z.literal(${JSON.stringify(v)})`).join(", ")}])`;
    }
    const t = schema.type;
    if (Array.isArray(t)) {
      return `z.union([${t.map((tt) => zodFromSchema({ ...schema, type: tt })).join(", ")}])`;
    }
    switch (t) {
      case "string":
        return "z.string()";
      case "number":
      case "integer":
        return "z.number()";
      case "boolean":
        return "z.boolean()";
      case "null":
        return "z.null()";
      case "array":
        return `z.array(${zodFromSchema(schema.items || {})})`;
      case "object": {
        const props = schema.properties || {};
        const required: string[] = schema.required || [];
        const entries = Object.entries(props).map(([k, v]: [string, any]) => {
          const base = `${JSON.stringify(k)}: ${zodFromSchema(v)}`;
          return required.includes(k) ? `  ${base}` : `  ${base}.optional()`;
        });
        const obj = `z.object({\n${entries.join(",\n")}\n})`;
        if (schema.additionalProperties) {
          const ap = schema.additionalProperties === true ? "z.any()" : zodFromSchema(schema.additionalProperties);
          return `${obj}.catchall(${ap})`;
        }
        return obj;
      }
      default: {
        if (schema.anyOf) return `z.union([${(schema.anyOf as any[]).map(zodFromSchema).join(", ")}])`;
        if (schema.oneOf) return `z.union([${(schema.oneOf as any[]).map(zodFromSchema).join(", ")}])`;
        if (schema.allOf && Array.isArray(schema.allOf)) {
          const parts = (schema.allOf as any[]).map(zodFromSchema);
          if (!parts.length) return "z.any()";
          return parts.slice(1).reduce((acc, cur) => `z.intersection(${acc}, ${cur})`, parts[0]);
        }
        return "z.any()";
      }
    }
  }, []);

  const generateZodFromJsonSchema = useCallback((schema: JSONSchema, rootName = "Root"): string => {
    const defs = collectNamedDefs(schema);
    const defBlocks = Object.entries(defs).map(([name, def]) => `export const ${name}Schema = ${zodFromSchema(def)};`);
    const rootBlock = `export const ${rootName}Schema = ${zodFromSchema(schema)};\nexport type ${rootName} = z.infer<typeof ${rootName}Schema>;`;
    const header = `import { z } from "zod";`;
    return [header, ...defBlocks, rootBlock].join("\n\n");
  }, [collectNamedDefs, zodFromSchema]);

  // Generate from OpenAPI: basic interfaces from components.schemas
  const sanitizeInterfaceName = useCallback((name: string) => {
    const cleaned = String(name).replace(/[^A-Za-z0-9_]/g, "_");
    return /^[A-Za-z_]/.test(cleaned) ? cleaned : `T_${cleaned}`;
  }, []);

  const generateTypesFromOpenAPI = useCallback((spec: any): string => {
    const schemas = (spec && spec.components && spec.components.schemas) || {};
    const entries = Object.entries(schemas as Record<string, any>);
    if (!entries.length) {
      return `// No components.schemas found in OpenAPI spec`;
    }
    const blocks = entries.map(([rawName, sch]) => {
      const name = sanitizeInterfaceName(rawName);
      return emitTsDeclaration(name, tsTypeFromSchema(sch));
    });
    return blocks.join("\n\n");
  }, [sanitizeInterfaceName, tsTypeFromSchema, emitTsDeclaration]);

  const handleGenerateTypes = useCallback(() => {
    setTypesError(null);
    setGenerating(true);
    try {
      if (parsed.isOpenAPI && parsed.value) {
        const code = generateTypesFromOpenAPI(parsed.value);
        setTypesOutput(code);
        setGenerating(false);
        return;
      }
      // Otherwise, JSON Schema route
      const text = schemaInput?.trim();
      const schema: any = text ? JSON.parse(text) : {};
      if (!isLikelyJsonSchema(schema)) {
        throw new Error("Provided input is not a valid-looking JSON Schema");
      }
      const code = typesMode === "ts"
        ? generateTypesFromJsonSchema(schema, "Root")
        : generateZodFromJsonSchema(schema, "Root");
      setTypesOutput(code);
    } catch (e: any) {
      setTypesError(e?.message || "Failed to generate types");
      setTypesOutput("");
    } finally {
      setGenerating(false);
    }
  }, [parsed.isOpenAPI, parsed.value, schemaInput, typesMode, isLikelyJsonSchema, generateTypesFromJsonSchema, generateZodFromJsonSchema, generateTypesFromOpenAPI]);

  const handleCopyTypes = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(typesOutput || "");
      setTypesCopied(true);
      setTimeout(() => setTypesCopied(false), 1200);
    } catch {}
  }, [typesOutput]);

  const handleDownloadTypes = useCallback(() => {
    const ext = parsed.isOpenAPI || typesMode === "ts" ? "ts" : "ts"; // both generate TS source
    const blob = new Blob([typesOutput || ""], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `types.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [typesOutput, parsed.isOpenAPI, typesMode]);

  const detectFormat = useCallback((text: string): "json" | "yaml" => {
    const t = (text || "").trim();
    if (t.startsWith("{") || t.startsWith("[")) return "json";
    return "yaml";
  }, []);

  const handleImport = useCallback(async () => {
    if (!importUrl) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch(importUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get("content-type") || "";
      const text = await res.text();
      const fmt: "json" | "yaml" = ct.includes("json") ? "json" : detectFormat(text);
      setFormat(fmt);
      setSource(text);
    } catch (e: any) {
      setImportError(e?.message || "Failed to import");
    } finally {
      setImporting(false);
    }
  }, [importUrl, detectFormat]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }, [source]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([source], { type: format === "json" ? "application/json" : "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schema.${format === "json" ? "json" : "yaml"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [source, format]);

  return (
    <ToolPage contentClassName="mx-auto max-w-6xl">
      <div
        className="bg-rp-surface/80 rounded-3xl shadow-2xl px-6 md:px-8 py-8 flex flex-col gap-6 border border-rp-highlight-high"
        style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-rp-iris drop-shadow">Schema & Types Studio</h2>
          <p className="text-sm text-rp-subtle max-w-3xl">Paste JSON/YAML or OpenAPI to parse, preview documentation, validate data, and generate TypeScript or Zod types entirely in-browser.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { k: "source", label: "Source" },
            { k: "docs", label: "Docs" },
            { k: "validate", label: "Validate" },
            { k: "types", label: "Types" },
          ].map((t) => (
            <button
              key={t.k}
              className={`px-4 py-2 rounded-xl border ${
                tab === (t.k as any)
                  ? "border-rp-iris text-rp-text bg-rp-overlay/80"
                  : "border-rp-highlight-high text-rp-subtle bg-rp-surface/40"
              }`}
              onClick={() => setTab(t.k as any)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Source */}
        {tab === "source" && (
          <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 w-full">
            <div className="flex md:flex-col gap-2">
              <label className="text-rp-subtle">Format</label>
              <div className="flex md:flex-col gap-2">
                <label className="flex items-center gap-2 text-rp-subtle">
                  <input
                    type="radio"
                    className="accent-[var(--rp-iris)]"
                    checked={format === "yaml"}
                    onChange={() => setFormat("yaml")}
                  />
                  YAML
                </label>
                <label className="flex items-center gap-2 text-rp-subtle">
                  <input
                    type="radio"
                    className="accent-[var(--rp-iris)]"
                    checked={format === "json"}
                    onChange={() => setFormat("json")}
                  />
                  JSON
                </label>
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <input
                  className="flex-1 rounded-xl px-3 py-2 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris"
                  placeholder="Import from URL (https://... .yaml or .json)"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
                <button
                  onClick={handleImport}
                  disabled={!importUrl || importing}
                  className="text-sm bg-rp-overlay/60 hover:bg-rp-overlay/40 disabled:opacity-60 border border-rp-highlight-high text-rp-text rounded-lg px-3 py-2"
                  title="Fetch and load from URL"
                >
                  {importing ? "Importing…" : "Import"}
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="text-sm bg-rp-overlay/60 hover:bg-rp-overlay/40 border border-rp-highlight-high text-rp-text rounded-lg px-3 py-2"
                    title="Copy current source"
                  >
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="text-sm bg-rp-overlay/60 hover:bg-rp-overlay/40 border border-rp-highlight-high text-rp-text rounded-lg px-3 py-2"
                    title="Download current source"
                  >
                    Download
                  </button>
                </div>
              </div>
              <textarea
                className="w-full min-h-[280px] rounded-xl px-4 py-3 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder={format === "yaml" ? "Paste YAML or OpenAPI here…" : "Paste JSON or OpenAPI here…"}
              />
              <div className="mt-2 text-sm">
                {importError && <div className="text-rp-love">Import error: {importError}</div>}
                {parsed.error ? (
                  <div className="text-rp-love">Parse error: {parsed.error}</div>
                ) : (
                  <div className="text-rp-foam">Parsed successfully{parsed.isOpenAPI ? " • OpenAPI detected" : ""}.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Docs */}
        {tab === "docs" && (
          <div className="w-full">
            {!parsed.value ? (
              <div className="text-rp-love">Nothing parsed yet. Paste a spec on the Source tab.</div>
            ) : !parsed.isOpenAPI ? (
              <div className="text-rp-subtle">Not an OpenAPI spec. Add top-level <code className="text-rp-iris">openapi</code> (3.x) or <code className="text-rp-iris">swagger: 2.0</code>.</div>
            ) : (
              <div className="rounded-xl border border-rp-highlight-high bg-rp-overlay/80 p-2">
                {/* Swagger UI */}
                <SwaggerUI spec={parsed.value} docExpansion="list" defaultModelsExpandDepth={1} />
              </div>
            )}
          </div>
        )}

        {/* Validate */}
        {tab === "validate" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div>
              <h3 className="text-rp-iris font-semibold mb-2">JSON Schema</h3>
              <textarea
                className="w-full min-h-[220px] rounded-xl px-4 py-3 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris"
                value={schemaText}
                onChange={(e) => setSchemaText(e.target.value)}
              />
            </div>
            <div>
              <h3 className="text-rp-iris font-semibold mb-2">Data</h3>
              <textarea
                className="w-full min-h-[220px] rounded-xl px-4 py-3 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris"
                value={dataText}
                onChange={(e) => setDataText(e.target.value)}
              />
              <div className="mt-3 rounded-xl border border-rp-highlight-high bg-rp-overlay/80 p-3">
                {validateResult.ok ? (
                  <div className="text-rp-foam">Valid ✓</div>
                ) : (
                  <div>
                    <div className="text-rp-love mb-2">Invalid</div>
                    <ul className="list-disc pl-5 text-sm text-rp-subtle">
                      {(validateResult.errors || []).map((err: any, i: number) => (
                        <li key={i}>{err.instancePath || ""} {err.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Types */}
        {tab === "types" && (
          <div className="w-full flex flex-col gap-4">
            {parsed.isOpenAPI ? (
              <div className="rounded-xl border border-rp-highlight-high bg-rp-overlay/60 p-4 text-rp-text">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-rp-iris font-semibold">OpenAPI detected</span>
                  <button
                    onClick={() => handleGenerateTypes()}
                    disabled={generating}
                    className="ml-auto text-sm bg-rp-overlay/70 hover:bg-rp-overlay/50 disabled:opacity-60 border border-rp-highlight-high text-rp-text rounded-lg px-3 py-2"
                  >
                    {generating ? "Generating…" : "Generate TypeScript"}
                  </button>
                  <button
                    onClick={handleCopyTypes}
                    className="text-sm bg-rp-overlay/60 hover:bg-rp-overlay/40 border border-rp-highlight-high text-rp-text rounded-lg px-3 py-2"
                  >
                    {typesCopied ? "Copied ✓" : "Copy"}
                  </button>
                  <button
                    onClick={handleDownloadTypes}
                    className="text-sm bg-rp-overlay/60 hover:bg-rp-overlay/40 border border-rp-highlight-high text-rp-text rounded-lg px-3 py-2"
                  >
                    Download
                  </button>
                </div>
                {typesError && <div className="text-rp-love mb-2">{typesError}</div>}
                <textarea
                  className="w-full min-h-[320px] rounded-xl px-4 py-3 bg-rp-base/90 border border-rp-highlight-high text-rp-text font-mono text-sm"
                  value={typesOutput}
                  onChange={(e) => setTypesOutput(e.target.value)}
                  placeholder="Generated TypeScript types will appear here…"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-rp-highlight-high bg-rp-overlay/60 p-4 text-rp-text">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="text-rp-iris font-semibold">JSON Schema → {typesMode === "ts" ? "TypeScript" : "Zod"}</span>
                  <label className="flex items-center gap-2 text-rp-subtle">
                    <input
                      type="radio"
                      className="accent-[var(--rp-iris)]"
                      checked={typesMode === "ts"}
                      onChange={() => setTypesMode("ts")}
                    />
                    TS types
                  </label>
                  <label className="flex items-center gap-2 text-rp-subtle">
                    <input
                      type="radio"
                      className="accent-[var(--rp-iris)]"
                      checked={typesMode === "zod"}
                      onChange={() => setTypesMode("zod")}
                    />
                    Zod schema
                  </label>
                  <button
                    onClick={() => setSchemaInput(schemaText)}
                    className="text-xs bg-rp-overlay/30 hover:bg-rp-overlay/50 border border-rp-highlight-high text-rp-text rounded-lg px-2 py-1"
                    title="Load JSON Schema from Validate tab"
                  >
                    Use Validate schema
                  </button>
                  <button
                    onClick={handleGenerateTypes}
                    disabled={generating}
                    className="ml-auto text-sm bg-rp-overlay/60 hover:bg-rp-overlay/40 disabled:opacity-60 border border-rp-highlight-high text-rp-text rounded-lg px-3 py-2"
                  >
                    {generating ? "Generating…" : "Generate"}
                  </button>
                  <button
                    onClick={handleCopyTypes}
                    className="text-sm bg-rp-overlay/60 hover:bg-rp-overlay/40 border border-rp-highlight-high text-rp-text rounded-lg px-3 py-2"
                  >
                    {typesCopied ? "Copied ✓" : "Copy"}
                  </button>
                  <button
                    onClick={handleDownloadTypes}
                    className="text-sm bg-rp-overlay/60 hover:bg-rp-overlay/40 border border-rp-highlight-high text-rp-text rounded-lg px-3 py-2"
                  >
                    Download
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm text-rp-subtle mb-2">JSON Schema</h4>
                    <textarea
                      className="w-full min-h-[240px] rounded-xl px-4 py-3 bg-rp-base/90 border border-rp-highlight-high text-rp-text font-mono text-sm"
                      value={schemaInput}
                      onChange={(e) => setSchemaInput(e.target.value)}
                      placeholder="Paste JSON Schema here…"
                    />
                    {typesError && <div className="text-rp-love mt-2">{typesError}</div>}
                  </div>
                  <div>
                    <h4 className="text-sm text-rp-subtle mb-2">{typesMode === "ts" ? "TypeScript" : "Zod"} Output</h4>
                    <textarea
                      className="w-full min-h-[240px] rounded-xl px-4 py-3 bg-rp-base/90 border border-rp-highlight-high text-rp-text font-mono text-sm"
                      value={typesOutput}
                      onChange={(e) => setTypesOutput(e.target.value)}
                      placeholder="Generated code will appear here…"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolPage>
  );
}
