# Self-hosted typefaces

Vendored so the static export builds without a network fetch and the strict
`font-src 'self'` policy holds. All three are Latin subsets under the SIL Open
Font License 1.1.

| File | Family | What it is |
| --- | --- | --- |
| `archivo-latin-variable.woff2` | Archivo (Omnibus-Type) | Weight axis 100–900 at normal width. Interface text. Unmodified from `@fontsource-variable/archivo` (`archivo-latin-wght-normal.woff2`). |
| `archivo-display-latin-800.woff2` | Archivo (Omnibus-Type) | One static cut: expanded width (125), weight 800. Headings and the wordmark. |
| `atkinson-hyperlegible-mono-latin-variable.woff2` | Atkinson Hyperlegible Mono (Braille Institute) | Weight axis 200–800. Code and data. Unmodified from `@fontsource-variable/atkinson-hyperlegible-mono`. |

Archivo carries both voices of the interface. Its full variable file has a
width axis as well as weight and is 90 KB; the site only ever uses two widths,
so it ships the weight-only file (35 KB) plus one instanced heading cut
(15 KB) instead.

Atkinson Hyperlegible Mono is used for code and data because it keeps `0`/`O`
and `1`/`l`/`I` distinct, which matters for hashes, IDs and tokens.

## Regenerating the heading cut

The display file is an instance of Fontsource's two-axis Archivo file
(`archivo-latin-wdth-normal.woff2`), made with fontTools:

```python
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

font = instancer.instantiateVariableFont(
    TTFont("archivo-latin-wdth-normal.woff2"), {"wdth": 125, "wght": 800}
)
font.flavor = "woff2"
font.save("archivo-display-latin-800.woff2")
```

Requires `pip install fonttools brotli`.
