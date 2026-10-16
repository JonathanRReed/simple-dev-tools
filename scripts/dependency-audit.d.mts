export const EXPIRES_AT: string;
export function collectConsumerGraph(lock: unknown): {
  nodes: string[][];
  edges: string[][];
};
export function validateReport(input: {
  report: unknown;
  status: number | null;
  stderr?: string;
  productionReport: unknown;
  productionStatus: number | null;
  productionStderr?: string;
  graph: unknown;
  policy: unknown;
  now?: Date;
}): boolean;
