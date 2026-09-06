"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Renders an OpenAPI 3.x or Swagger 2.0 document as readable documentation.
 *
 * This replaces `swagger-ui-react`, which was a 1.2 MB chunk — by far the
 * heaviest dependency in the app — whose stylesheet was never imported, so it
 * rendered as unstyled text. Everything here is built from the app's own
 * components, so it costs no extra bytes, follows every theme, and uses native
 * <details> for disclosure (keyboard accessible, works with no JS of its own).
 *
 * The input is arbitrary user-supplied JSON/YAML, so every read is defensive:
 * a malformed spec renders what it can rather than throwing.
 */

type Rec = Record<string, unknown>;

function asRecord(value: unknown): Rec | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Rec)
    : null;
}
function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

const METHODS = ["get", "post", "put", "patch", "delete", "head", "options", "trace"] as const;
type Method = (typeof METHODS)[number];

/** Method colours read from the theme palette, so they work on all six themes. */
const METHOD_CLASS: Record<Method, string> = {
  get: "border-rp-foam text-rp-foam",
  post: "border-rp-pine text-rp-pine",
  put: "border-rp-gold text-rp-gold",
  patch: "border-rp-iris text-rp-iris",
  delete: "border-rp-love text-rp-love",
  head: "border-border text-muted-foreground",
  options: "border-border text-muted-foreground",
  trace: "border-border text-muted-foreground",
};

/** "#/components/schemas/Pet" -> "Pet" */
function refName(ref: string): string {
  const parts = ref.split("/");
  return parts[parts.length - 1] || ref;
}

/** A short, human-readable type label for a schema node. */
function schemaLabel(schema: unknown, depth = 0): string {
  const s = asRecord(schema);
  if (!s || depth > 4) return "any";
  const ref = asString(s.$ref);
  if (ref) return refName(ref);
  for (const key of ["allOf", "oneOf", "anyOf"] as const) {
    const branch = s[key];
    if (Array.isArray(branch)) {
      const joiner = key === "allOf" ? " & " : " | ";
      return branch.map((b) => schemaLabel(b, depth + 1)).join(joiner);
    }
  }
  const enumValues = s.enum;
  if (Array.isArray(enumValues)) {
    return enumValues.map((v) => JSON.stringify(v)).join(" | ");
  }
  const type = asString(s.type);
  if (type === "array") return `${schemaLabel(s.items, depth + 1)}[]`;
  const format = asString(s.format);
  if (type && format) return `${type} <${format}>`;
  return type ?? "object";
}

type ParamRow = {
  name: string;
  location: string;
  type: string;
  required: boolean;
  description?: string;
};

function readParams(raw: unknown): ParamRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: ParamRow[] = [];
  for (const entry of raw) {
    const p = asRecord(entry);
    if (!p) continue;
    const ref = asString(p.$ref);
    if (ref) {
      rows.push({ name: refName(ref), location: "ref", type: "—", required: false });
      continue;
    }
    rows.push({
      name: asString(p.name) ?? "(unnamed)",
      location: asString(p.in) ?? "—",
      // Swagger 2.0 puts type/format on the parameter; 3.x nests a schema.
      type: p.schema !== undefined ? schemaLabel(p.schema) : schemaLabel(p),
      required: p.required === true,
      description: asString(p.description),
    });
  }
  return rows;
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="brutal-label">{label}</p>
      {children}
    </div>
  );
}

function ParamTable({ rows }: { rows: ParamRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-border text-left">
            <th scope="col" className="brutal-label py-1.5 pr-3 font-semibold">Name</th>
            <th scope="col" className="brutal-label py-1.5 pr-3 font-semibold">In</th>
            <th scope="col" className="brutal-label py-1.5 pr-3 font-semibold">Type</th>
            <th scope="col" className="brutal-label py-1.5 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.name}-${row.location}-${i}`} className="border-b border-border/60 align-top last:border-b-0">
              <td className="py-1.5 pr-3 font-mono text-foreground">
                {row.name}
                {row.required ? (
                  <span className="ml-1 text-destructive" title="required" aria-label="required">*</span>
                ) : null}
              </td>
              <td className="py-1.5 pr-3 font-mono text-muted-foreground">{row.location}</td>
              <td className="py-1.5 pr-3 font-mono text-muted-foreground">{row.type}</td>
              <td className="py-1.5 text-muted-foreground">{row.description ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Operation({ method, path, operation }: { method: Method; path: string; operation: Rec }) {
  const summary = asString(operation.summary);
  const description = asString(operation.description);
  const deprecated = operation.deprecated === true;
  const params = readParams(operation.parameters);

  const requestBody = asRecord(operation.requestBody);
  const bodyContent = requestBody ? asRecord(requestBody.content) : null;

  const responses = asRecord(operation.responses) ?? {};
  const responseEntries = Object.entries(responses);

  const tags = Array.isArray(operation.tags)
    ? operation.tags.filter((t): t is string => typeof t === "string")
    : [];

  return (
    <details className="group border-b-2 border-border last:border-b-0">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
        <Badge variant="outline" className={cn("shrink-0", METHOD_CLASS[method])}>
          {method}
        </Badge>
        <code className="min-w-0 flex-1 break-all font-mono text-sm text-foreground">{path}</code>
        {deprecated ? <Badge variant="destructive">deprecated</Badge> : null}
        {summary ? (
          <span className="hidden max-w-[40%] truncate text-sm text-muted-foreground md:inline">{summary}</span>
        ) : null}
        <span
          aria-hidden="true"
          className="shrink-0 font-mono text-xs text-muted-foreground group-open:hidden"
        >
          +
        </span>
        <span
          aria-hidden="true"
          className="hidden shrink-0 font-mono text-xs text-muted-foreground group-open:inline"
        >
          −
        </span>
      </summary>

      <div className="flex flex-col gap-4 border-t-2 border-border bg-background/40 px-3 py-4">
        {summary ? <p className="text-sm font-semibold text-foreground">{summary}</p> : null}
        {description ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        ) : null}

        {params.length > 0 ? (
          <Section label="Parameters">
            <ParamTable rows={params} />
          </Section>
        ) : null}

        {bodyContent ? (
          <Section label="Request body">
            <ul className="flex flex-col gap-1 text-sm">
              {Object.entries(bodyContent).map(([mediaType, media]) => (
                <li key={mediaType} className="flex flex-wrap items-center gap-2">
                  <code className="font-mono text-foreground">{mediaType}</code>
                  <span className="font-mono text-muted-foreground">
                    {schemaLabel(asRecord(media)?.schema)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {responseEntries.length > 0 ? (
          <Section label="Responses">
            <ul className="flex flex-col gap-1.5 text-sm">
              {responseEntries.map(([status, value]) => {
                const res = asRecord(value);
                const content = res ? asRecord(res.content) : null;
                const mediaTypes = content ? Object.keys(content) : [];
                const ok = status.startsWith("2");
                return (
                  <li key={status} className="flex flex-wrap items-baseline gap-2">
                    <Badge variant="outline" className={ok ? "border-rp-pine text-rp-pine" : undefined}>
                      {status}
                    </Badge>
                    <span className="text-muted-foreground">
                      {asString(res?.description) ?? "—"}
                    </span>
                    {mediaTypes.length > 0 ? (
                      <span className="font-mono text-xs text-muted-foreground">
                        {mediaTypes.join(", ")}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Section>
        ) : null}
      </div>
    </details>
  );
}

export default function OpenApiDocs({ spec }: { spec: unknown }) {
  const doc = asRecord(spec);
  const info = doc ? asRecord(doc.info) : null;
  const paths = doc ? asRecord(doc.paths) : null;

  const version = asString(doc?.openapi) ?? asString(doc?.swagger);

  // 3.x servers, or the 2.0 host/basePath/schemes triple.
  const servers = ((): string[] => {
    const list = doc?.servers;
    if (Array.isArray(list)) {
      return list
        .map((s) => asString(asRecord(s)?.url))
        .filter((u): u is string => typeof u === "string");
    }
    const host = asString(doc?.host);
    if (!host) return [];
    const basePath = asString(doc?.basePath) ?? "";
    const schemes = Array.isArray(doc?.schemes)
      ? doc.schemes.filter((s): s is string => typeof s === "string")
      : ["https"];
    return schemes.map((scheme) => `${scheme}://${host}${basePath}`);
  })();

  const operations = ((): { path: string; method: Method; operation: Rec }[] => {
    if (!paths) return [];
    const out: { path: string; method: Method; operation: Rec }[] = [];
    for (const [path, item] of Object.entries(paths)) {
      const pathItem = asRecord(item);
      if (!pathItem) continue;
      for (const method of METHODS) {
        const operation = asRecord(pathItem[method]);
        if (operation) out.push({ path, method, operation });
      }
    }
    return out;
  })();

  const title = asString(info?.title) ?? "Untitled API";
  const apiVersion = asString(info?.version);
  const description = asString(info?.description);

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-2 border-b-2 border-border px-3 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-xl font-bold tracking-tight text-foreground">{title}</h3>
          {apiVersion ? <Badge variant="secondary">v{apiVersion}</Badge> : null}
          {version ? <Badge variant="outline">OAS {version}</Badge> : null}
        </div>
        {description ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
        {servers.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="brutal-label">Servers</span>
            {servers.map((url) => (
              <code key={url} className="break-all font-mono text-xs text-muted-foreground">{url}</code>
            ))}
          </div>
        ) : null}
      </header>

      {operations.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted-foreground">
          This spec declares no operations under <code className="font-mono">paths</code>.
        </p>
      ) : (
        <>
          <p className="border-b-2 border-border px-3 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {operations.length} operation{operations.length === 1 ? "" : "s"}
          </p>
          <div>
            {operations.map(({ path, method, operation }) => (
              <Operation key={`${method}-${path}`} method={method} path={path} operation={operation} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
