1) Schema & Types Studio (Tool “/studio/schema”)

Goal: Drop in JSON/YAML/OpenAPI → validate/lint → preview docs → generate Types/validators.

Core features

Editors: JSON & YAML tabs with live errors. YAML parsed with js-yaml (or yaml). 
Chromium Git Repositories

JSON Schema validation: Ajv (supports modern drafts). Inline markers + results panel. 
ajv.js.org
+2
ajv.js.org
+2

OpenAPI viewer: Render OAS 3.x via Swagger UI; spec link/upload. 
swagger.io
+1

Spec linting: Spectral rules (default + your custom ruleset). 
stoplight.io
docs.stoplight.io

Type generation:

OpenAPI → TypeScript with openapi-typescript (or hey-api/openapi-ts). 
GitHub
+1

JSON → many languages / Zod via quicktype; optional Zod output. 
quicktype.io
GitHub
+1

Exports: Copy TS types, Download types.d.ts, and “Insert into Snippet Generator”.

UX notes

Left sidebar: Files (specs), Center: Editor/Preview (tabs: Source, Docs, Lint, Types), Right: Actions & History.

Import from URL, drag-drop files, or paste JSON/YAML.

Clear OAS 3.0/3.1 badge (link to spec). 
swagger.io

Risks / mitigations

Big specs: load in Worker; virtualize lists.

YAML parsing safety: treat all input as untrusted; no custom types execution. (General YAML safety caveats.) 
Phil Nash

Success criteria

Paste openapi.yaml → see interactive docs, 0-click type export, Spectral findings listed with rule links.

2) Security & Tokens (Tool “/studio/security”)

Goal: Safely inspect tokens & demo signing/verification—without ever sending data off-device.

Core features

JWT decoder: Base64URL decode header/payload; highlight iss, sub, aud, exp. Clear “Decoding ≠ trust” callout; link to JWT primer. 
JSON Web Tokens - jwt.io
+1

(Optional) verify signature: Paste JWK/PEM → verify HS256/RS256/ES256 using Web Crypto API SubtleCrypto.sign/verify. 
MDN Web Docs
+2
MDN Web Docs
+2

Hashes/HMACs: Compute SHA-256 digest and HMAC for sample payloads (Web Crypto). 
MDN Web Docs

Safety UI: “Do not paste production secrets” banner; no persistence unless user checks “Save locally”.

UX

Left: Input (token, key). Right: Decoded tabs (Header, Payload, Verify). Footer: Copy JSON / copy cURL example.

Success criteria

Pasted JWT shows claims instantly; valid signature toggles a green “verified” badge (if key provided).

3) Utilities — split into three useful mini-tools
A) Regex Lab (Tool “/tools/regex”)

Features

Live match, groups table, g|i|m|s|u|y toggles, replace preview, and a small cheat-sheet.

Teach with MDN links for syntax and methods (test, matchAll). 
MDN Web Docs
+2
MDN Web Docs
+2

Extras

Sample patterns gallery (emails, UUIDs), shareable permalink.

B) IDs & Scheduling (Tool “/tools/ids-cron”)

Features

UUID v4: use crypto.randomUUID() (secure; works in Workers). 
MDN Web Docs
+1

ULID: generate & explain sortability; show timestamp/random parts. 
GitHub

Cron builder/parser: human-readable description via cRonstrue. (GitLab uses it client-side too.) 
GitHub
bradymholt.github.io
GitLab Docs

C) Encoders & QR (Tool “/tools/encode-qr”)

Features

URL encode/decode: encodeURIComponent/decodeURIComponent helper with reserved-char table. 
MDN Web Docs
+1

Base64/URL-safe Base64: btoa/atob helpers + note about binary vs text; link to MDN nuance article. 
MDN Web Docs
+2
MDN Web Docs
+2
web.dev

QR generator: client-side QR code as PNG/SVG using qrcode (or similar). 
npm