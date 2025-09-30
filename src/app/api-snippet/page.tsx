"use client";
import React, { useState } from "react";

import ToolPage from '@/components/layout/ToolPage';

const httpMethods = ["GET", "POST", "PUT", "DELETE"];

type SnippetSet = {
  curl: string;
  python: string;
  js: string;
};

function generateSnippets(url: string, method: string, body: string): SnippetSet {
  const isBody = method === "POST" || method === "PUT";
  return {
    curl: `curl -X ${method} '${url}'${isBody && body ? ` \\\n  -H 'Content-Type: application/json' \\\n  -d '${body.replace(/'/g, "\\'")}'` : ""}`,
    python: `import requests\n\nurl = '${url}'\n${isBody && body ? `payload = ${body}\n` : ""}headers = {'Content-Type': 'application/json'}\nresponse = requests.${method.toLowerCase()}(url${isBody && body ? ", json=payload, headers=headers" : ""})\nprint(response.text)`,
    js: `fetch('${url}', {\n  method: '${method}',${isBody && body ? `\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(${body})` : ""}\n})\n  .then(res => res.json())\n  .then(console.log);`,
  };
}

export default function ApiSnippet() {
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [body, setBody] = useState("");
  const [snippets, setSnippets] = useState<SnippetSet | null>(null);

  const handleGenerate = () => {
    setSnippets(generateSnippets(url, method, body));
  };

  const handleCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
  };

  return (
    <ToolPage contentClassName="mx-auto max-w-5xl">
      <div className="bg-rp-surface/80 rounded-3xl shadow-2xl px-6 sm:px-8 py-8 flex flex-col gap-6 border border-rp-highlight-high" style={{backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)'}}>
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-rp-iris drop-shadow">API Snippet Generator</h2>
          <p className="text-sm text-rp-subtle max-w-2xl">Generate REST snippets for cURL, Python requests, and fetch. Provide an endpoint, method, and optional JSON payload.</p>
        </div>
        <form className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.6fr)_minmax(0,0.4fr)]" onSubmit={(e: React.FormEvent<HTMLFormElement>) => {e.preventDefault(); handleGenerate();}}>
          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="API Endpoint (https://...)"
              className="w-full rounded-xl px-4 py-3 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris transition"
              value={url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
              required
            />
            <div className="flex flex-col gap-4 sm:flex-row">
              <select
                className="w-full max-w-[160px] rounded-xl px-4 py-3 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris transition"
                value={method}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMethod(e.target.value)}
              >
                {httpMethods.map(m => <option key={m}>{m}</option>)}
              </select>
              {(method === "POST" || method === "PUT") && (
                <textarea
                  className="flex-1 rounded-xl px-4 py-3 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris transition min-h-[120px]"
                  placeholder='JSON Body (e.g. {"name":"value"})'
                  value={body}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
                />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="px-6 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80 font-semibold shadow hover:bg-rp-overlay/60 transition"
              >
                Generate
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-rp-highlight-high bg-rp-overlay/70 p-4 text-sm text-rp-subtle">
              <p className="font-semibold text-rp-iris mb-1">Quick tips</p>
              <ul className="space-y-1 list-disc pl-4">
                <li>Body defaults to JSON with `Content-Type: application/json`.</li>
                <li>Use `PUT` or `POST` to toggle the payload area.</li>
                <li>Snippets are generated entirely client-side.</li>
              </ul>
            </div>
          </div>
        </form>
        {snippets && (
          <div className="grid gap-4 xl:grid-cols-3 mt-2">
            {Object.entries(snippets).map(([lang, code]) => (
              <div key={lang} className="relative bg-rp-overlay/70 border border-rp-highlight-high rounded-xl p-4 font-mono text-xs sm:text-sm text-rp-text shadow-inner">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-rp-iris font-semibold uppercase">{lang}</span>
                  <button
                    className="px-2 py-1 rounded border border-rp-iris bg-rp-overlay/80 text-rp-text text-xs hover:bg-rp-overlay/60 transition"
                    onClick={() => handleCopy(code)}
                    type="button"
                  >Copy</button>
                </div>
                <pre className="whitespace-pre-wrap break-all">{code}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolPage>
  );
}
