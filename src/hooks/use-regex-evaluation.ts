'use client';
import { useEffect, useState } from 'react';

export interface MatchInfo {
  match: string;
  index: number;
  length: number;
  groups: (string | undefined)[];
  named: Record<string, string | undefined>;
}
interface Evaluation {
  list: MatchInfo[];
  captureGroups: number;
  truncated: boolean;
  error: string | null;
  pending: boolean;
  replaced: { value: string | null; error: string | null };
  split: { parts: string[] | null; error: string | null; truncated: boolean };
}
const empty = (error: string | null = null, pending = false): Evaluation => ({
  list: [], captureGroups: 0, truncated: false, error, pending,
  replaced: { value: null, error }, split: { parts: null, error, truncated: false },
});
export function useRegexEvaluation(pattern: string, flags: string, text: string, replacement: string) {
  const [result, setResult] = useState<Evaluation>(() => empty(null, true));
  useEffect(() => {
    let worker: Worker | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setResult(empty(null, true));
    const start = setTimeout(() => {
      try {
        worker = new Worker('/regex-worker.js');
        const finish = (next: Evaluation) => {
          clearTimeout(timeout);
          worker?.terminate();
          setResult(next);
        };
        worker.onmessage = ({ data }) => finish(data.error ? empty(data.error) : { ...data, pending: false });
        worker.onerror = () => finish(empty('Pattern worker could not run. Reload the page and try again.'));
        timeout = setTimeout(() => finish(empty('Pattern took too long. Simplify it or use a shorter test string.')), 1500);
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker messages do not take a target origin.
        worker.postMessage({ pattern, flags, text, replacement });
      } catch {
        setResult(empty('Pattern worker could not run. Reload the page and try again.'));
      }
    }, 150);
    return () => { clearTimeout(start); clearTimeout(timeout); worker?.terminate(); };
  }, [pattern, flags, text, replacement]);
  return result;
}
