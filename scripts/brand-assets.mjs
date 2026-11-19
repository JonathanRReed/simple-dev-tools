// Regenerates the brand images in /public from one drawing:
//
//   bun run assets:brand
//
// The mark is the `/` key (see src/components/BrandMark.tsx). In the app it is
// an inline SVG that follows the active theme; favicons and the social card
// cannot do that, so they are rendered here in the default (Art Deco) palette.
// Rendering goes through the Chromium that Playwright already installs for the
// e2e suite, so there is no extra image dependency.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url);
const publicDir = new URL('public/', root);
const logoDir = new URL('simple_dev_tools_logo_assets/', publicDir);
const fontDir = new URL('src/app/fonts/', root);

const PALETTE = {
  bench: '#020508',
  panel: '#071018',
  key: '#17263a',
  keyLip: '#0b131d',
  ink: '#f8f2e6',
  muted: '#c8b89e',
  brass: '#e1bb62',
  brassLip: '#8a6f33',
  line: 'rgba(248, 242, 230, 0.16)',
  dot: 'rgba(248, 242, 230, 0.11)',
  hues: ['#7fd4bd', '#e1bb62', '#b3adf2', '#f0dbb0', '#f0957f', '#6aa3cf'],
};

/** The keycap mark on a 32-unit grid. `inset` leaves room around it. */
function markSvg({ size, background = null, inset = 0 }) {
  const scale = (32 - inset * 2) / 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  ${background ? `<rect width="32" height="32" fill="${background}"/>` : ''}
  <g transform="translate(${inset} ${inset}) scale(${scale})">
    <rect x="1" y="4" width="30" height="27" rx="7.5" fill="${PALETTE.brassLip}"/>
    <rect x="1" y="1" width="30" height="26" rx="7.5" fill="${PALETTE.brass}"/>
    <path d="M19.6 6.8 12.4 21.2" fill="none" stroke="${PALETTE.bench}" stroke-width="4.2" stroke-linecap="round"/>
  </g>
</svg>`;
}

/** Pack PNG images into an .ico container (PNG payloads are valid since Vista). */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

async function fontFace(file, family, extra) {
  const data = await readFile(new URL(file, fontDir));
  return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${data.toString('base64')}) format("woff2");${extra}}`;
}

const TOOLS = [
  'API Snippets', 'Query Strings', 'Encoders & QR', 'JSON', 'SQLite',
  'Schemas', 'Regex', 'Text Diff', 'Markdown', 'Timestamps',
  'IDs & Cron', 'Tokens', 'File Hashes', 'Mermaid', 'Color',
];
const TOOL_HUES = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 5];
const LEGENDS = ['1', '2', '3', '4', '5', 'Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G'];

async function socialCardHtml() {
  const fonts = [
    await fontFace('archivo-latin-variable.woff2', 'Archivo', 'font-weight:100 900;'),
    await fontFace('archivo-display-latin-800.woff2', 'Archivo Display', 'font-weight:800;'),
    await fontFace('atkinson-hyperlegible-mono-latin-variable.woff2', 'Atkinson Mono', 'font-weight:200 800;'),
  ].join('');
  const keys = TOOLS.map(
    (name, index) => `<div class="key">
      <div class="top"><i style="background:${PALETTE.hues[TOOL_HUES[index]]}"></i><b>${LEGENDS[index]}</b></div>
      <span>${name.replace('&', '&amp;')}</span>
    </div>`
  ).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${fonts}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:${PALETTE.bench};color:${PALETTE.ink};font-family:Archivo,sans-serif;
  background-image:radial-gradient(circle at 1px 1px,${PALETTE.dot} 1px,transparent 0);background-size:22px 22px;
  display:grid;grid-template-columns:520px 1fr;gap:44px;padding:64px 64px 60px;align-items:center}
h1{font-family:'Archivo Display',sans-serif;font-size:51px;line-height:1.03;font-weight:800;letter-spacing:-0.022em}
p{margin-top:26px;font-size:25px;line-height:1.42;color:${PALETTE.muted};max-width:440px}
.brand{display:flex;align-items:center;gap:14px;margin-bottom:38px;font-family:'Archivo Display',sans-serif;font-size:23px;font-weight:800;letter-spacing:-0.01em}
.brand svg{width:44px;height:44px}
.rack{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px 12px}
.key{height:132px;border-radius:14px;background:${PALETTE.key};border:1px solid ${PALETTE.keyLip};
  box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 5px 0 ${PALETTE.keyLip},0 9px 12px -4px rgba(0,0,0,.6);
  padding:13px 13px 12px;display:flex;flex-direction:column;justify-content:space-between}
.top{display:flex;justify-content:space-between;align-items:center}
.top i{display:block;width:22px;height:22px;border-radius:7px}
.top b{font:600 14px "Atkinson Mono",monospace;color:${PALETTE.muted}}
.key span{font-size:15.5px;font-weight:600;line-height:1.15}
</style></head><body>
<div>
  <div class="brand">${markSvg({ size: 44 })}Simple Dev Tools</div>
  <h1>Developer tools that stay in your browser.</h1>
  <p>Fifteen tools that run on your machine. Nothing you paste is uploaded.</p>
</div>
<div class="rack">${keys}</div>
</body></html>`;
}

const browser = await chromium.launch();
try {
  await mkdir(logoDir, { recursive: true });
  const page = await browser.newPage();

  async function renderSvg(svg, size) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg}</body></html>`
    );
    return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  }

  // Browser-tab icons: the bare keycap on a transparent background.
  const tabSizes = [16, 32, 48, 64];
  const tabIcons = [];
  for (const size of tabSizes) {
    tabIcons.push({ size, data: await renderSvg(markSvg({ size }), size) });
  }
  await writeFile(new URL('favicon-16x16.png', logoDir), tabIcons[0].data);
  await writeFile(new URL('favicon-32x32.png', logoDir), tabIcons[1].data);
  const ico = buildIco(tabIcons);
  await writeFile(new URL('favicon.ico', logoDir), ico);
  await writeFile(new URL('favicon.ico', publicDir), ico);
  await writeFile(new URL('icon.svg', logoDir), `${markSvg({ size: 32 })}\n`);

  // Home-screen icons: the keycap on the bench color, with breathing room so
  // rounded and circular launcher masks do not clip it.
  for (const [file, size] of [
    ['apple-touch-icon.png', 180],
    ['android-chrome-192x192.png', 192],
    ['simple-dev-tools-favicon-512x512.png', 512],
  ]) {
    const svg = markSvg({ size, background: PALETTE.bench, inset: 6 });
    await writeFile(new URL(file, logoDir), await renderSvg(svg, size));
  }

  // Social card. PNG, because link unfurlers do not reliably decode AVIF.
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(await socialCardHtml());
  await page.evaluate(() => document.fonts.ready);
  await writeFile(new URL('og-image.png', publicDir), await page.screenshot());

  console.log(`Brand assets written to ${fileURLToPath(publicDir)}`);
} finally {
  await browser.close();
}
