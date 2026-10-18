import { isCollection, isPair, isScalar, parseDocument } from 'yaml';
import { assertSafeJsonNumber } from './json-precision';

/**
 * Parse YAML and reject numbers that conversion would round. The check runs on
 * the document's scalar nodes, so it also covers mapping keys and the entries of
 * tagged collections such as !!set and !!omap, which become strings, Sets, or Maps
 * after conversion and so escape a check on the converted value.
 */
export function parseYamlWithoutUnsafeIntegers(text: string): unknown {
  const doc = parseDocument(text);
  if (doc.errors.length > 0) throw doc.errors[0];
  const pending: unknown[] = [doc.contents];
  while (pending.length) {
    const node = pending.pop();
    if (isScalar(node)) assertSafeJsonNumber(node.value);
    else if (isPair(node)) pending.push(node.key, node.value);
    else if (isCollection(node)) for (const item of node.items) pending.push(item);
  }
  return doc.toJS();
}
