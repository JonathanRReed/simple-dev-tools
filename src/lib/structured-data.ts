import type { Graph, ItemList, WebApplication, WithContext } from "schema-dts";

import { siteConfig, toolCatalog, type ToolMeta } from "@/lib/site";

/**
 * schema.org structured data, typed via schema-dts so a renamed property or a
 * wrong enum fails typecheck instead of silently going stale.
 *
 * Each page states only what is true of that page. The site, its author and
 * its publisher are described once, in the root layout, and everything else
 * refers to them by `@id`. Previously every page embedded the full catalog of
 * all tools with the author and publisher repeated inside each entry, which
 * added about 23 KB of markup to every document.
 */

const WEBSITE_ID = `${siteConfig.url}/#website`;
const AUTHOR_ID = `${siteConfig.url}/#author`;
const PUBLISHER_ID = `${siteConfig.url}/#publisher`;

/** The site, its author and its publisher. Rendered once, by the root layout. */
export const siteJsonLd: Graph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      name: siteConfig.name,
      description: siteConfig.description,
      url: siteConfig.url,
      inLanguage: "en",
      creator: { "@id": AUTHOR_ID },
      publisher: { "@id": PUBLISHER_ID },
    },
    {
      "@type": "Person",
      "@id": AUTHOR_ID,
      name: siteConfig.author.name,
      alternateName: "Jonathan Reed",
      url: siteConfig.author.url,
      sameAs: ["https://jonathanrreed.com/", "https://github.com/JonathanRReed"],
    },
    {
      "@type": "Organization",
      "@id": PUBLISHER_ID,
      name: siteConfig.provider.name,
      url: siteConfig.provider.url,
    },
  ],
};

/** The catalog, for the home page. */
export const toolListJsonLd: WithContext<ItemList> = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: `${siteConfig.name} catalog`,
  numberOfItems: toolCatalog.length,
  itemListElement: toolCatalog.map((tool, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: tool.title,
    url: `${siteConfig.url}${tool.href}`,
  })),
};

/** One tool, for that tool's own page. */
export function toolJsonLd(tool: ToolMeta): WithContext<WebApplication> {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.title,
    description: tool.description,
    url: `${siteConfig.url}${tool.href}`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    isPartOf: { "@id": WEBSITE_ID },
    creator: { "@id": AUTHOR_ID },
    publisher: { "@id": PUBLISHER_ID },
  };
}
