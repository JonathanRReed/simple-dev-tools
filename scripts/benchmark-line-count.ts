// Run with `bun scripts/benchmark-line-count.ts` (timings vary by runtime).
// Correctness is enforced separately; do not turn timing ratios into CI gates.
import { countLines } from '../src/lib/line-count';

const splitCount = (text: string) => text === '' ? 0 : text.split(/\r\n|\r|\n/).length;
const characterCount = (text: string) => {
  if (text === '') return 0;
  let lines = 1;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    if (char === 10) lines++;
    else if (char === 13) {
      if (text.charCodeAt(i + 1) === 10) i++;
      lines++;
    }
  }
  return lines;
};
let checksum = 0;
for (const [name, text] of [
  ['small', 'hello\nworld'],
  ['dense CRLF', 'abcdef\r\n'.repeat(60_000)],
  ['sparse LF', ('x'.repeat(999) + '\n').repeat(500)],
  ['no newline', 'x'.repeat(500_000)],
  ['all CRLF', '\r\n'.repeat(250_000)],
  ['mixed Unicode', '日本語😀\r\nhello\nworld\r'.repeat(20_000)],
]) {
  const row: Record<string, string | number> = { input: name, chars: text.length };
  for (const [label, count] of Object.entries({ split: splitCount, character: characterCount, nativeSearch: countLines })) {
    if (count(text) !== splitCount(text)) throw new Error(`Parity failed: ${name}/${label}`);
    for (let i = 0; i < 50; i++) checksum += count(text);
    const samples: number[] = [];
    for (let sample = 0; sample < 7; sample++) {
      const start = performance.now();
      for (let i = 0; i < 50; i++) checksum += count(text);
      samples.push((performance.now() - start) / 50);
    }
    samples.sort((a, b) => a - b);
    row[`${label} median ms`] = samples[3];
    row[`${label} range ms`] = `${samples[0]}–${samples[6]}`;
  }
  console.log(JSON.stringify(row));
}
console.log({ checksum });
