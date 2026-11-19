import { expect, test } from "bun:test";

import { siteConfig, toolCatalog } from "./site";
import { siteJsonLd, toolJsonLd, toolListJsonLd } from "./structured-data";

const idsIn = (value: unknown): string[] =>
  JSON.stringify(value).match(/"@id":"[^"]+"/g)?.map((m) => m.slice(7, -1)) ?? [];

// Assert on the serialized form, which is what actually reaches the page.
const serialized = <T>(value: unknown): T => JSON.parse(JSON.stringify(value)) as T;

test("the site graph defines every id that other blocks point at", () => {
  const graph = serialized<{ "@graph": { "@id"?: string }[] }>(siteJsonLd)["@graph"];
  const defined = new Set(graph.flatMap((node) => (node["@id"] ? [node["@id"]] : [])));
  expect(defined.size).toBe(3);
  for (const tool of toolCatalog) {
    for (const id of idsIn(toolJsonLd(tool))) expect(defined.has(id)).toBe(true);
  }
});

test("each tool describes itself with its own canonical URL and catalog text", () => {
  for (const tool of toolCatalog) {
    expect(toolJsonLd(tool)).toMatchObject({
      "@type": "WebApplication",
      name: tool.title,
      description: tool.description,
      url: `${siteConfig.url}${tool.href}`,
    });
  }
});

test("the home list covers the whole catalog, in order", () => {
  const list = serialized<{
    numberOfItems: number;
    itemListElement: { position: number; name: string; url: string }[];
  }>(toolListJsonLd);
  const items = list.itemListElement;
  expect(list.numberOfItems).toBe(toolCatalog.length);
  expect(items.map((item) => item.position)).toEqual(toolCatalog.map((_, index) => index + 1));
  expect(items.map((item) => item.url)).toEqual(toolCatalog.map((tool) => `${siteConfig.url}${tool.href}`));
});

test("a page's structured data stays small", () => {
  // The previous layout embedded the full catalog in every page (11.6 KB).
  expect(JSON.stringify(siteJsonLd).length).toBeLessThan(1200);
  expect(JSON.stringify(toolJsonLd(toolCatalog[0])).length).toBeLessThan(900);
});
