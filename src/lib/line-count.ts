/**
 * Count LF, CRLF, and bare CR lines, including a final empty line.
 * Native searches avoid a split array and a JavaScript scan of every character,
 * keeping long lines and newline-free inputs inexpensive too.
 */
export function countLines(text: string): number {
  if (text === '') return 0;
  let lines = 1;
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) {
    lines++;
  }
  for (let i = text.indexOf('\r'); i !== -1; i = text.indexOf('\r', i + 1)) {
    // CRLF was already counted by its LF; count only standalone CR here.
    if (text.charCodeAt(i + 1) !== 10) lines++;
  }
  return lines;
}
