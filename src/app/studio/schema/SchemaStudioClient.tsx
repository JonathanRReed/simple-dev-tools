"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import YAML from "yaml";
import { AlignLeft, Download, RotateCcw, Sparkles, Wand2 } from "lucide-react";

import ToolShell from "@/components/tool/ToolShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { ResultPanel } from "@/components/ui/result-panel";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SwaggerUIProps {
  spec?: unknown;
  url?: string;
  docExpansion?: "list" | "full" | "none";
  defaultModelsExpandDepth?: number;
  defaultModelExpandDepth?: number;
  [key: string]: unknown;
}

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false }) as React.ComponentType<SwaggerUIProps>;

type AjvInstance = import("ajv").default;

const SAMPLE_SOURCE = `openapi: 3.0.3\ninfo:\n  title: Sample API\n  version: 1.0.0\npaths:\n  /hello:\n    get:\n      responses:\n        '200':\n          description: OK\n`;
const SAMPLE_SCHEMA = '{"type":"object","properties":{"name":{"type":"string"}},"required":["name"]}';
const SAMPLE_DATA = '{"name":"Alice"}';

function parseInput(source: string, format: "json" | "yaml") {
  // Treat an empty source as "nothing parsed" rather than a successful parse.
  if (!source.trim()) {
    return { value: null, error: null, isOpenAPI: false, empty: true };
  }
  try {
    let value: any;
    if (format === "json") {
      value = JSON.parse(source);
    } else {
      value = YAML.parse(source);
    }
    // YAML/JSON can legitimately parse to null/undefined — that is not a useful spec.
    if (value === null || value === undefined) {
      return { value: null, error: null, isOpenAPI: false, empty: true };
    }
    const isOpenAPI = !!(
      value &&
      // Accept both the quoted string form (`swagger: "2.0"`) and the unquoted
      // numeric form (`swagger: 2.0`, which YAML/JSON parses to the number 2).
      (typeof (value as any).openapi === "string" || String((value as any).swagger) === "2.0")
    );
    return { value, error: null, isOpenAPI, empty: false };
  } catch (e: any) {
    return { value: null, error: e?.message || "Failed to parse", isOpenAPI: false, empty: false };
  }
}

// Build a short, human-readable detail string from an Ajv error's `params`
// (the structured info Ajv attaches per keyword). Purely presentational — it
// supplements instancePath + message. Returns "" when there's nothing useful.
function ajvErrorDetail(err: any): string {
  const params = err?.params;
  if (!params || typeof params !== "object") return "";
  if (Array.isArray(params.allowedValues)) {
    const allowed = params.allowedValues
      .map((v: any) => (typeof v === "string" ? `"${v}"` : String(v)))
      .join(" | ");
    return ` (allowed: ${allowed})`;
  }
  if (typeof params.missingProperty === "string") {
    return ` (missing: ${params.missingProperty})`;
  }
  if (typeof params.additionalProperty === "string") {
    return ` (unexpected: ${params.additionalProperty})`;
  }
  if (params.type != null) {
    const type = Array.isArray(params.type) ? params.type.join(" | ") : String(params.type);
    return ` (type: ${type})`;
  }
  return "";
}

// Detect the JSON Schema dialect from a schema's `$schema` URI so we can pick a
// matching Ajv class (the default Ajv only understands draft-07).
function detectDialect(schema: any): "2020" | "2019" | "draft07" {
  const id = schema && typeof schema === "object" && typeof schema.$schema === "string" ? schema.$schema : "";
  if (id.includes("2020-12")) return "2020";
  if (id.includes("2019-09")) return "2019";
  return "draft07";
}

// Build a FRESH Ajv instance for the given dialect on every validation run.
// A fresh instance avoids the "schema with key/id already exists" error that a
// memoized instance throws when an $id-bearing schema is recompiled after an
// edit, and it sidesteps draft-07-only limitations for 2019-09 / 2020-12 specs.
async function createAjv(dialect: "2020" | "2019" | "draft07"): Promise<AjvInstance> {
  const { default: addFormatsFn } = await import("ajv-formats");
  let instance: AjvInstance;
  if (dialect === "2020") {
    const { default: Ajv2020 } = await import("ajv/dist/2020");
    instance = new Ajv2020({ allErrors: true, strict: false });
  } else if (dialect === "2019") {
    const { default: Ajv2019 } = await import("ajv/dist/2019");
    instance = new Ajv2019({ allErrors: true, strict: false });
  } else {
    const { default: AjvCtor } = await import("ajv");
    instance = new AjvCtor({ allErrors: true, strict: false });
  }
  // Register format keywords (date-time, email, uri, …) so they resolve instead
  // of being reported as unknown keywords.
  addFormatsFn(instance as any);
  return instance;
}

export default function SchemaStudioClient() {
  const [tab, setTab] = useState<"source" | "docs" | "validate" | "types">("source");
  const [format, setFormat] = useState<"json" | "yaml">("yaml");
  const [source, setSource] = useState<string>(SAMPLE_SOURCE);
  const [importUrl, setImportUrl] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Types tab state
  const [typesMode, setTypesMode] = useState<"ts" | "zod">("ts");
  const [typesOutput, setTypesOutput] = useState<string>("");
  const [typesError, setTypesError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const parsed = useMemo(() => parseInput(source, format), [source, format]);

  // Single shared JSON-Schema source, used by BOTH the Validate tab and the
  // JSON-Schema -> Types route (previously two competing inputs).
  const [schemaText, setSchemaText] = useState<string>(SAMPLE_SCHEMA);
  const [dataText, setDataText] = useState<string>(SAMPLE_DATA);
  const [validatorError, setValidatorError] = useState<string | null>(null);
  const [validateResult, setValidateResult] = useState<{ ok: boolean; errors: any[] | null } | null>(null);
  const [validating, setValidating] = useState(false);

  // Debounced validation (~300ms) so we don't re-validate / flash on every keystroke.
  useEffect(() => {
    if (tab !== "validate") return;

    // With either input empty there's nothing to validate; clear stale state and
    // let the render's "Provide both a schema and data" hint show (an empty
    // string is not valid JSON, so parsing it would otherwise surface a
    // misleading "not valid JSON" error here).
    if (!schemaText.trim() || !dataText.trim()) {
      setValidatorError(null);
      setValidateResult(null);
      setValidating(false);
      return;
    }

    let cancelled = false;
    setValidating(true);
    const handle = setTimeout(async () => {
      // Parse the schema and data SEPARATELY so a JSON syntax error in either
      // input surfaces as a distinct "not valid JSON" message via validatorError,
      // instead of being mistaken for a failed validation run (which would show
      // the misleading "does not conform to the schema" headline).
      let schema: any;
      try {
        schema = JSON.parse(schemaText);
      } catch (error: any) {
        if (!cancelled) {
          setValidatorError(`Schema is not valid JSON: ${error?.message || "parse error"}`);
          setValidateResult(null);
          setValidating(false);
        }
        return;
      }
      let data: any;
      try {
        data = JSON.parse(dataText);
      } catch (error: any) {
        if (!cancelled) {
          setValidatorError(`Data is not valid JSON: ${error?.message || "parse error"}`);
          setValidateResult(null);
          setValidating(false);
        }
        return;
      }
      try {
        // Pick an Ajv class that matches the schema's declared dialect, and use a
        // fresh instance per run so recompiling an $id-bearing schema never throws.
        const validator = await createAjv(detectDialect(schema));
        if (cancelled) return;
        setValidatorError(null);
        const compiled = validator.compile(schema);
        const valid = compiled(data);
        if (!cancelled) {
          setValidateResult({ ok: !!valid, errors: compiled.errors || null });
        }
      } catch (error: any) {
        // A failure here is a schema-compilation problem (invalid schema), not a
        // validation result — route it through validatorError too rather than the
        // "does not conform" path.
        if (!cancelled) {
          setValidatorError(error?.message || "Failed to compile schema.");
          setValidateResult(null);
        }
      } finally {
        if (!cancelled) setValidating(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [tab, schemaText, dataText]);

  // --- JSON Schema helpers ----
  type JSONSchema = any;

  // Sanitize a type/identifier name the SAME way for declarations AND $refs so
  // that an emitted "FooBar" reference always resolves to an emitted "FooBar"
  // declaration.
  const sanitizeName = useCallback((name: string) => {
    const cleaned = String(name).replace(/[^A-Za-z0-9_]/g, "_");
    return /^[A-Za-z_]/.test(cleaned) ? cleaned : `T_${cleaned}`;
  }, []);

  // A local ref points inside the current document ("#/..."). Anything else is an
  // external/remote ref we can't resolve in-browser.
  const isLocalRef = useCallback((ref: string) => typeof ref === "string" && ref.startsWith("#/"), []);

  const refName = useCallback(
    (ref: string) => sanitizeName(ref.split("/").pop() || "Ref"),
    [sanitizeName]
  );

  const isLikelyJsonSchema = useCallback((obj: any): boolean => {
    if (!obj || typeof obj !== "object") return false;
    if (
      obj.$schema ||
      obj.properties ||
      obj.type ||
      obj.$defs ||
      obj.definitions ||
      obj.enum ||
      obj.anyOf ||
      obj.oneOf ||
      obj.allOf ||
      obj.$ref
    )
      return true;
    return false;
  }, []);

  // Build an optional JSDoc block from a schema's title/description.
  const jsDoc = useCallback((schema: JSONSchema): string => {
    if (!schema || typeof schema !== "object") return "";
    // Escape any "*/" so a title/description containing it can't terminate the
    // generated comment early (and break the surrounding code).
    const escape = (s: string) => s.replace(/\*\//g, "*\\/");
    const lines: string[] = [];
    if (typeof schema.title === "string" && schema.title.trim()) lines.push(escape(schema.title.trim()));
    if (typeof schema.description === "string" && schema.description.trim()) {
      if (lines.length) lines.push("");
      lines.push(...escape(schema.description.trim()).split("\n"));
    }
    if (!lines.length) return "";
    return `/**\n${lines.map((l) => ` * ${l}`.replace(/\s+$/, "")).join("\n")}\n */\n`;
  }, []);

  const tsTypeFromSchema = useCallback(
    (schema: JSONSchema): string => {
      if (!schema || typeof schema !== "object") return "any";
      if (schema.$ref && typeof schema.$ref === "string") {
        // External/remote refs can't be resolved in-browser — emit a safe
        // `unknown` instead of a dangling identifier with no declaration.
        if (!isLocalRef(schema.$ref)) return "unknown /* unresolved external $ref */";
        return refName(schema.$ref);
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
          const propTypes = Object.entries(props).map(([, v]: [string, any]) => tsTypeFromSchema(v));
          const entries = Object.entries(props).map(([k, v]: [string, any], i) => {
            const optional = required.includes(k) ? "" : "?";
            return `  ${JSON.stringify(k)}${optional}: ${propTypes[i]};`;
          });
          const allowAdditional = schema.additionalProperties;
          if (allowAdditional) {
            // The index signature value type must be assignable from EVERY named
            // property value type — AND from `undefined` when any property is
            // optional (an optional `foo?: string` has type `string | undefined`).
            // Otherwise TS rejects the declaration. Use the union of all named
            // property types + the additionalProperties type + `undefined` for
            // optionals (or `any` when additionalProperties === true).
            const hasOptional = Object.keys(props).some((k) => !required.includes(k));
            let ap: string;
            if (allowAdditional === true) {
              ap = "any";
            } else {
              const apType = tsTypeFromSchema(allowAdditional);
              const parts = Array.from(
                new Set([...propTypes, apType, hasOptional ? "undefined" : ""].filter(Boolean))
              );
              ap = parts.length ? parts.join(" | ") : apType;
            }
            entries.push(`  [k: string]: ${ap};`);
          }
          if (!entries.length) return "Record<string, never>";
          return `{\n${entries.join("\n")}\n}`;
        }
        default: {
          if (schema.anyOf) return (schema.anyOf as any[]).map(tsTypeFromSchema).join(" | ");
          if (schema.oneOf) return (schema.oneOf as any[]).map(tsTypeFromSchema).join(" | ");
          if (schema.allOf) return (schema.allOf as any[]).map(tsTypeFromSchema).join(" & ");
          return "any";
        }
      }
    },
    [refName, isLocalRef]
  );

  // Collect every $ref target referenced anywhere in a schema tree.
  const collectRefs = useCallback((node: any, acc: Set<string>) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((n) => collectRefs(n, acc));
      return;
    }
    if (typeof node.$ref === "string") acc.add(node.$ref);
    for (const key of Object.keys(node)) {
      if (key === "$ref") continue;
      collectRefs(node[key], acc);
    }
  }, []);

  // Find a $ref's target definition inside the root document (supports JSON
  // Schema definitions/$defs and OpenAPI components.schemas / Swagger 2.0
  // definitions). Returns null if it can't be located locally.
  const resolveRef = useCallback((root: any, ref: string): any => {
    if (!ref.startsWith("#/")) return null;
    const path = ref.slice(2).split("/").map((seg) => seg.replace(/~1/g, "/").replace(/~0/g, "~"));
    let cur: any = root;
    for (const seg of path) {
      if (cur && typeof cur === "object" && seg in cur) cur = cur[seg];
      else return null;
    }
    return cur ?? null;
  }, []);

  // Gather all named definitions, keyed by their SANITIZED name (so they match
  // emitted $ref names). Includes JSON Schema definitions/$defs, OpenAPI
  // components.schemas and Swagger 2.0 definitions, plus any LOCAL $ref targets
  // we can resolve that weren't already named. External refs are skipped (they
  // emit an `unknown` fallback at the use site instead).
  const collectNamedDefs = useCallback(
    (root: JSONSchema): Record<string, any> => {
      const out: Record<string, any> = {};
      const add = (raw: string, def: any) => {
        if (def == null) return;
        const key = sanitizeName(raw);
        if (!(key in out)) out[key] = def;
      };
      const sources: Record<string, any>[] = [
        root?.definitions,
        root?.$defs,
        root?.components?.schemas,
      ].filter((s): s is Record<string, any> => !!s && typeof s === "object");
      for (const src of sources) {
        for (const [name, def] of Object.entries(src)) add(name, def);
      }

      // Ensure every LOCAL referenced name resolves to a declaration.
      const refs = new Set<string>();
      collectRefs(root, refs);
      for (const ref of refs) {
        if (!isLocalRef(ref)) continue;
        const key = refName(ref);
        if (key in out) continue;
        const resolved = resolveRef(root, ref);
        if (resolved != null) out[key] = resolved;
      }
      return out;
    },
    [sanitizeName, refName, collectRefs, resolveRef, isLocalRef]
  );

  // Emit 'interface' only when the generated type is an object literal; otherwise emit a 'type' alias.
  const emitTsDeclaration = useCallback(
    (name: string, schema: JSONSchema): string => {
      const typeExpr = tsTypeFromSchema(schema).trim();
      const doc = jsDoc(schema);
      if (typeExpr.startsWith("{")) return `${doc}export interface ${name} ${typeExpr}`;
      return `${doc}export type ${name} = ${typeExpr};`;
    },
    [tsTypeFromSchema, jsDoc]
  );

  const generateTypesFromJsonSchema = useCallback(
    (schema: JSONSchema, rootName = "Root"): string => {
      const defs = collectNamedDefs(schema);
      const defBlocks = Object.entries(defs).map(([name, def]) => emitTsDeclaration(name, def));
      const blocks = [...defBlocks];
      // Only emit a Root declaration when the document itself describes a type
      // (i.e. it's not just a container of definitions).
      if (schema && (schema.type || schema.properties || schema.enum || schema.$ref || schema.anyOf || schema.oneOf || schema.allOf)) {
        blocks.push(emitTsDeclaration(rootName, schema));
      }
      if (!blocks.length) return "// No types found in JSON Schema";
      return blocks.join("\n\n");
    },
    [collectNamedDefs, emitTsDeclaration]
  );

  const zodFromSchema = useCallback(
    (schema: JSONSchema): string => {
      if (!schema || typeof schema !== "object") return "z.any()";
      if (schema.$ref && typeof schema.$ref === "string") {
        // External/remote refs can't be resolved in-browser — emit a safe
        // z.unknown() instead of referencing a Schema const that never exists.
        if (!isLocalRef(schema.$ref)) return "z.unknown() /* unresolved external $ref */";
        // z.lazy defers evaluation so a $ref to a schema declared LATER in the
        // file doesn't throw a TDZ ReferenceError (and recursive refs work too).
        return `z.lazy(() => ${refName(schema.$ref)}Schema)`;
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
          const obj = entries.length ? `z.object({\n${entries.join(",\n")}\n})` : `z.object({})`;
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
    },
    [refName, isLocalRef]
  );

  const generateZodFromJsonSchema = useCallback(
    (schema: JSONSchema, rootName = "Root"): string => {
      const defs = collectNamedDefs(schema);
      const header = `import { z } from "zod";`;
      const defBlocks = Object.entries(defs).map(([name, def]) => `export const ${name}Schema = ${zodFromSchema(def)};`);
      const blocks = [header, ...defBlocks];
      if (schema && (schema.type || schema.properties || schema.enum || schema.$ref || schema.anyOf || schema.oneOf || schema.allOf)) {
        blocks.push(
          `export const ${rootName}Schema = ${zodFromSchema(schema)};\nexport type ${rootName} = z.infer<typeof ${rootName}Schema>;`
        );
      }
      return blocks.join("\n\n");
    },
    [collectNamedDefs, zodFromSchema]
  );

  // OpenAPI / Swagger: pull the schema map from components.schemas (3.x) or
  // top-level definitions (Swagger 2.0).
  const openApiSchemaMap = useCallback((spec: any): Record<string, any> => {
    const fromComponents = spec?.components?.schemas;
    if (fromComponents && typeof fromComponents === "object") return fromComponents;
    if (spec?.definitions && typeof spec.definitions === "object") return spec.definitions;
    return {};
  }, []);

  const generateTypesFromOpenAPI = useCallback(
    (spec: any): string => {
      const schemas = openApiSchemaMap(spec);
      const entries = Object.entries(schemas as Record<string, any>);
      if (!entries.length) {
        return `// No components.schemas (or Swagger definitions) found in spec`;
      }
      const blocks = entries.map(([rawName, sch]) => emitTsDeclaration(sanitizeName(rawName), sch));
      return blocks.join("\n\n");
    },
    [openApiSchemaMap, sanitizeName, emitTsDeclaration]
  );

  const generateZodFromOpenAPI = useCallback(
    (spec: any): string => {
      const schemas = openApiSchemaMap(spec);
      const entries = Object.entries(schemas as Record<string, any>);
      if (!entries.length) {
        return `// No components.schemas (or Swagger definitions) found in spec`;
      }
      const header = `import { z } from "zod";`;
      const blocks = entries.map(
        ([rawName, sch]) => `export const ${sanitizeName(rawName)}Schema = ${zodFromSchema(sch)};`
      );
      return [header, ...blocks].join("\n\n");
    },
    [openApiSchemaMap, sanitizeName, zodFromSchema]
  );

  const handleGenerateTypes = useCallback(() => {
    setTypesError(null);
    setGenerating(true);
    try {
      // OpenAPI route now honors the TS/Zod toggle too.
      if (parsed.isOpenAPI && parsed.value) {
        const code =
          typesMode === "ts"
            ? generateTypesFromOpenAPI(parsed.value)
            : generateZodFromOpenAPI(parsed.value);
        setTypesOutput(code);
        return;
      }
      // Otherwise, JSON Schema route (shared schemaText source).
      const text = schemaText?.trim();
      const schema: any = text ? JSON.parse(text) : {};
      if (!isLikelyJsonSchema(schema)) {
        throw new Error("Provided input is not a valid-looking JSON Schema");
      }
      const code =
        typesMode === "ts"
          ? generateTypesFromJsonSchema(schema, "Root")
          : generateZodFromJsonSchema(schema, "Root");
      setTypesOutput(code);
    } catch (e: any) {
      setTypesError(e?.message || "Failed to generate types");
      setTypesOutput("");
    } finally {
      setGenerating(false);
    }
  }, [
    parsed.isOpenAPI,
    parsed.value,
    schemaText,
    typesMode,
    isLikelyJsonSchema,
    generateTypesFromJsonSchema,
    generateZodFromJsonSchema,
    generateTypesFromOpenAPI,
    generateZodFromOpenAPI,
  ]);

  // When the TS/Zod toggle changes, the already-generated output is stale for the
  // newly-selected mode (its label and Download filename would no longer match the
  // code shown). Regenerate it so the box, label and filename stay consistent.
  // (Skip the very first render so we don't auto-generate before the user asks.)
  const didMountTypesMode = useRef(false);
  useEffect(() => {
    if (!didMountTypesMode.current) {
      didMountTypesMode.current = true;
      return;
    }
    if (typesOutput) handleGenerateTypes();
    // We intentionally key only on typesMode: this should fire when the user
    // toggles the output mode, not on every output edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typesMode]);

  const handleDownloadTypes = useCallback(() => {
    // Both TS and Zod outputs are TypeScript source; name the file accordingly.
    const filename = typesMode === "zod" ? "schema.zod.ts" : "types.ts";
    const blob = new Blob([typesOutput || ""], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [typesOutput, typesMode]);

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
      // An opaque response (mode "no-cors" or some CORS failures) has type
      // "opaque" / status 0 and an unreadable body.
      if (res.type === "opaque" || res.status === 0) {
        throw new Error(
          "The server returned an opaque response (blocked by CORS). The remote host must allow cross-origin requests for in-browser import to work."
        );
      }
      if (!res.ok) throw new Error(`Request failed with HTTP ${res.status} ${res.statusText}`.trim());
      const ct = res.headers.get("content-type") || "";
      const text = await res.text();
      const fmt: "json" | "yaml" = ct.includes("json") ? "json" : detectFormat(text);
      setFormat(fmt);
      setSource(text);
    } catch (e: any) {
      // Network-level CORS failures usually surface as a TypeError "Failed to fetch".
      const raw = e?.message || "Failed to import";
      const message = /failed to fetch|networkerror|load failed/i.test(raw)
        ? "Failed to fetch. The request was blocked, likely CORS, or the URL is unreachable. The remote host must send Access-Control-Allow-Origin for in-browser import."
        : raw;
      setImportError(message);
    } finally {
      setImporting(false);
    }
  }, [importUrl, detectFormat]);

  const handleDownloadSource = useCallback(() => {
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

  // Pretty-print the Source editor in-place. JSON via JSON.parse/stringify,
  // YAML via YAML round-trip. On failure we leave the text untouched and let the
  // existing parsed.error Alert (driven by parseInput) surface the problem.
  const handleFormatSource = useCallback(() => {
    const text = source;
    if (!text.trim()) return;
    try {
      const formatted =
        format === "json"
          ? JSON.stringify(JSON.parse(text), null, 2)
          : YAML.stringify(YAML.parse(text));
      setSource(formatted);
    } catch {
      // Re-set the (invalid) source so the parsed.error Alert reflects current
      // input even if nothing else changed; the existing Alert renders the message.
      setSource(text);
    }
  }, [source, format]);

  // Pretty-print the Validate-tab JSON Schema editor (always JSON). On failure,
  // surface the message through the existing validatorError -> Alert path.
  const handleFormatSchema = useCallback(() => {
    const text = schemaText;
    if (!text.trim()) return;
    try {
      const formatted = JSON.stringify(JSON.parse(text), null, 2);
      setSchemaText(formatted);
      setValidatorError(null);
    } catch (e: any) {
      setValidatorError(e?.message || "Invalid JSON. Cannot format.");
    }
  }, [schemaText]);

  const handleReset = useCallback(() => {
    setSource("");
    setImportUrl("");
    setImportError(null);
    setSchemaText("");
    setDataText("");
    setTypesOutput("");
    setTypesError(null);
    setValidateResult(null);
  }, []);

  const handleLoadSample = useCallback(() => {
    setSource(SAMPLE_SOURCE);
    setFormat("yaml");
    setSchemaText(SAMPLE_SCHEMA);
    setDataText(SAMPLE_DATA);
    setImportError(null);
    setTypesError(null);
  }, []);

  // Stable ids for a11y (Field htmlFor / control id pairing).
  const ids = useRef({
    importUrl: "schema-import-url",
    source: "schema-source",
    validateSchema: "schema-validate-schema",
    validateData: "schema-validate-data",
    typesSchema: "schema-types-schema",
  }).current;

  const parsedStatus = parsed.error
    ? null
    : parsed.empty
      ? null
      : parsed.value;

  return (
    <ToolShell
      eyebrow="Schema Studio"
      toolbar={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={handleLoadSample}>
            <Sparkles className="size-4" aria-hidden="true" />
            Sample
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset
          </Button>
        </>
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="source">Source</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
          <TabsTrigger value="validate">Validate</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
        </TabsList>

        {/* Source */}
        <TabsContent value="source">
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-[150px_1fr]">
            <Field label="Format" className="md:pt-1">
              <div className="flex gap-4 md:flex-col md:gap-2">
                <label className="flex items-center gap-2 font-mono text-sm">
                  <input
                    type="radio"
                    name="schema-format"
                    checked={format === "yaml"}
                    onChange={() => setFormat("yaml")}
                  />
                  YAML
                </label>
                <label className="flex items-center gap-2 font-mono text-sm">
                  <input
                    type="radio"
                    name="schema-format"
                    checked={format === "json"}
                    onChange={() => setFormat("json")}
                  />
                  JSON
                </label>
              </div>
            </Field>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-2">
                <Field
                  label="Import from URL"
                  htmlFor={ids.importUrl}
                  className="min-w-[220px] flex-1"
                  hint="Fetches a remote .yaml/.json spec (subject to CORS)."
                >
                  <Input
                    id={ids.importUrl}
                    className="font-mono"
                    placeholder="https://example.com/openapi.yaml"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                  />
                </Field>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleImport}
                  disabled={!importUrl || importing}
                >
                  {importing ? "Importing…" : "Import"}
                </Button>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleFormatSource}
                    disabled={!source.trim()}
                  >
                    <AlignLeft className="size-4" aria-hidden="true" />
                    Format
                  </Button>
                  <CopyButton value={() => source} label="Copy" />
                  <Button type="button" variant="outline" size="sm" onClick={handleDownloadSource}>
                    <Download className="size-4" aria-hidden="true" />
                    Download
                  </Button>
                </div>
              </div>

              {importError && <Alert variant="error">{importError}</Alert>}

              <Field label="Schema or OpenAPI source" htmlFor={ids.source}>
                <textarea
                  id={ids.source}
                  className="min-h-[280px] w-full px-4 py-3 font-mono text-sm"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder={format === "yaml" ? "Paste YAML or OpenAPI here…" : "Paste JSON or OpenAPI here…"}
                />
              </Field>

              {parsed.error ? (
                <Alert variant="error">Parse error: {parsed.error}</Alert>
              ) : parsed.empty ? (
                <Alert variant="info">Nothing parsed yet. Paste a spec or load the sample.</Alert>
              ) : (
                <Alert variant="success">
                  Parsed successfully{parsed.isOpenAPI ? ". OpenAPI detected" : ""}.
                </Alert>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Docs */}
        <TabsContent value="docs">
          <div className="w-full">
            {!parsedStatus ? (
              <Alert variant="info">Nothing parsed yet. Paste a spec on the Source tab.</Alert>
            ) : !parsed.isOpenAPI ? (
              <Alert variant="warning">
                Not an OpenAPI spec. Add a top-level <code className="font-mono">openapi</code> (3.x) or{" "}
                <code className="font-mono">swagger: 2.0</code> key.
              </Alert>
            ) : (
              <ResultPanel title="API documentation" bodyClassName="p-0">
                <div className="max-h-[640px] overflow-auto">
                  <SwaggerUI spec={parsed.value} docExpansion="list" defaultModelsExpandDepth={1} />
                </div>
              </ResultPanel>
            )}
          </div>
        </TabsContent>

        {/* Validate */}
        <TabsContent value="validate">
          <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleFormatSchema}
                  disabled={!schemaText.trim()}
                >
                  <AlignLeft className="size-4" aria-hidden="true" />
                  Format
                </Button>
              </div>
              <Field label="JSON Schema" htmlFor={ids.validateSchema}>
                <textarea
                  id={ids.validateSchema}
                  className="min-h-[220px] w-full px-4 py-3 font-mono text-sm"
                  value={schemaText}
                  onChange={(e) => setSchemaText(e.target.value)}
                  placeholder="Paste a JSON Schema…"
                />
              </Field>
            </div>
            <div className="flex flex-col gap-3">
              <Field label="Data" htmlFor={ids.validateData}>
                <textarea
                  id={ids.validateData}
                  className="min-h-[220px] w-full px-4 py-3 font-mono text-sm"
                  value={dataText}
                  onChange={(e) => setDataText(e.target.value)}
                  placeholder="Paste JSON data to validate…"
                />
              </Field>
              <ResultPanel title="Result">
                {validatorError ? (
                  <Alert variant="error">{validatorError}</Alert>
                ) : !schemaText.trim() || !dataText.trim() ? (
                  <p className="text-sm text-muted-foreground">
                    Provide both a schema and data to validate.
                  </p>
                ) : validating || !validateResult ? (
                  <p className="text-sm text-muted-foreground">Validating…</p>
                ) : validateResult.ok ? (
                  <Alert variant="success">Valid. Data conforms to the schema.</Alert>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Alert variant="error">Invalid. Data does not conform to the schema.</Alert>
                    <ul className="list-disc space-y-1 pl-5 font-mono text-xs text-muted-foreground">
                      {(validateResult.errors || []).map((err: any, i: number) => {
                        const detail = ajvErrorDetail(err);
                        return (
                          <li key={i}>
                            {err.instancePath ? `${err.instancePath} ` : ""}
                            {err.message}
                            {detail && (
                              <span className="text-muted-foreground/70">{detail}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </ResultPanel>
            </div>
          </div>
        </TabsContent>

        {/* Types */}
        <TabsContent value="types">
          <div className="flex w-full flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={parsed.isOpenAPI ? "default" : "outline"}>
                {parsed.isOpenAPI ? "OpenAPI source" : "JSON Schema source"}
              </Badge>
              <span className="brutal-label">Output</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 font-mono text-sm">
                  <input
                    type="radio"
                    name="schema-types-mode"
                    checked={typesMode === "ts"}
                    onChange={() => setTypesMode("ts")}
                  />
                  TS types
                </label>
                <label className="flex items-center gap-2 font-mono text-sm">
                  <input
                    type="radio"
                    name="schema-types-mode"
                    checked={typesMode === "zod"}
                    onChange={() => setTypesMode("zod")}
                  />
                  Zod schema
                </label>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button type="button" onClick={handleGenerateTypes} disabled={generating}>
                  <Wand2 className="size-4" aria-hidden="true" />
                  {generating ? "Generating…" : "Generate"}
                </Button>
                <CopyButton value={() => typesOutput} disabled={!typesOutput} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTypes}
                  disabled={!typesOutput}
                >
                  <Download className="size-4" aria-hidden="true" />
                  Download
                </Button>
              </div>
            </div>

            {parsed.isOpenAPI ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  Generating {typesMode === "ts" ? "TypeScript interfaces" : "Zod schemas"} from the
                  OpenAPI source on the Source tab.
                </p>
                {typesError && <Alert variant="error">{typesError}</Alert>}
                <Label htmlFor={ids.typesSchema}>
                  {typesMode === "ts" ? "TypeScript" : "Zod"} output
                </Label>
                <textarea
                  id={ids.typesSchema}
                  className="min-h-[320px] w-full px-4 py-3 font-mono text-sm"
                  value={typesOutput}
                  onChange={(e) => setTypesOutput(e.target.value)}
                  placeholder={`Generated ${typesMode === "ts" ? "TypeScript" : "Zod"} will appear here…`}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="JSON Schema"
                  htmlFor={ids.typesSchema}
                  hint="Shared with the Validate tab."
                  error={typesError ?? undefined}
                >
                  <textarea
                    id={ids.typesSchema}
                    className="min-h-[280px] w-full px-4 py-3 font-mono text-sm"
                    value={schemaText}
                    onChange={(e) => setSchemaText(e.target.value)}
                    placeholder="Paste JSON Schema here…"
                  />
                </Field>
                <Field label={`${typesMode === "ts" ? "TypeScript" : "Zod"} output`}>
                  <textarea
                    aria-label={`${typesMode === "ts" ? "TypeScript" : "Zod"} output`}
                    className="min-h-[280px] w-full px-4 py-3 font-mono text-sm"
                    value={typesOutput}
                    onChange={(e) => setTypesOutput(e.target.value)}
                    placeholder="Generated code will appear here…"
                  />
                </Field>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </ToolShell>
  );
}
