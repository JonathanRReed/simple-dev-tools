type JsonLdProps = {
  data: object;
};

/**
 * Emits one schema.org JSON-LD block. "<" is escaped so the JSON can never
 * close the <script> element early.
 *
 * This is a raw-HTML sink, so it is on the reviewed list in
 * lib/html-injection.test.ts. Only pass it data authored in this repository
 * (lib/structured-data.ts). Never pass anything a visitor typed or a URL
 * carried.
 */
export default function JsonLd({ data }: JsonLdProps) {
  const html = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: html }} />;
}
