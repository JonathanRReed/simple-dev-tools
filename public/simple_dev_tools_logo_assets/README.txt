Simple Dev Tools logo assets

The mark is the "/" key: the shortcut that opens search anywhere on the site.

Every image here, plus /favicon.ico and /og-image.png, is generated from one
drawing by scripts/brand-assets.mjs. Do not edit them by hand; change the
script and run:

    bun run assets:brand

- Browser tab: favicon.ico (16, 32, 48, 64), favicon-32x32.png, favicon-16x16.png, icon.svg
  The bare keycap on a transparent background.
- Home screen: apple-touch-icon.png, android-chrome-192x192.png, simple-dev-tools-favicon-512x512.png
  The keycap on the dark bench color, with margin for launcher masks.
- Web manifest: site.webmanifest

In the app itself the mark is an inline SVG (src/components/BrandMark.tsx) so it
follows the active theme. These files are fixed to the default Art Deco palette.
