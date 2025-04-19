"use client";
import React, { useState } from "react";

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
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-8">
      <div className="bg-[#181926]/80 rounded-3xl shadow-2xl px-8 py-10 max-w-2xl w-full flex flex-col items-center gap-6 relative border border-[#a78bfa]" style={{backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)'}}>
        <h2 className="text-3xl font-bold text-[#a78bfa] mb-2 text-center drop-shadow">API Snippet Generator</h2>
        <form className="w-full flex flex-col gap-4" onSubmit={(e: React.FormEvent<HTMLFormElement>) => {e.preventDefault(); handleGenerate();}}>
          <input
            type="text"
            placeholder="API Endpoint (https://...)"
            className="rounded-xl px-4 py-3 bg-[#23243a]/70 border border-[#a78bfa66] text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a78bfa] transition"
            value={url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
            required
          />
          <div className="flex gap-4">
            <select
              className="rounded-xl px-4 py-3 bg-[#23243a]/70 border border-[#a78bfa66] text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a78bfa] transition"
              value={method}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMethod(e.target.value)}
            >
              {httpMethods.map(m => <option key={m}>{m}</option>)}
            </select>
            {(method === "POST" || method === "PUT") && (
              <textarea
                className="rounded-xl px-4 py-3 bg-[#23243a]/70 border border-[#a78bfa66] text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a78bfa] transition flex-1 min-h-[48px]"
                placeholder='JSON Body (e.g. {"name":"value"})'
                value={body}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
              />
            )}
          </div>
          <button
            type="submit"
            className="mt-2 bg-gradient-to-r from-[#a78bfa] to-[#ff4dc4] text-white font-bold py-2 px-6 rounded-xl shadow hover:opacity-80 transition"
          >
            Generate
          </button>
        </form>
        {snippets && (
          <div className="w-full flex flex-col gap-4 mt-6">
            {Object.entries(snippets).map(([lang, code]) => (
              <div key={lang} className="relative bg-[#23243a]/80 border border-[#a78bfa99] rounded-xl p-4 font-mono text-sm text-gray-200 shadow-inner">
                <div className="absolute top-2 right-3 flex gap-2">
                  <span className="text-[#a78bfa] font-semibold uppercase">{lang}</span>
                  <button
                    className="ml-2 px-2 py-1 rounded bg-[#a78bfa] text-white text-xs hover:bg-[#ff4dc4] transition"
                    onClick={() => handleCopy(code)}
                    type="button"
                  >Copy</button>
                </div>
                <pre className="whitespace-pre-wrap break-all mt-6">{code}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
