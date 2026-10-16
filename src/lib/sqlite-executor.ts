export type SqliteResultSet = { columns: string[]; values: unknown[][] };
export type SqliteReply = { results: SqliteResultSet[]; changed: number; sawWrite: boolean; truncated: boolean };
export class SqliteWorkerFailure extends Error {
  constructor(message: string, public databaseLost = false) { super(message); }
}

type Pending = { id: number; resolve: (reply: SqliteReply) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
export class SqliteExecutor {
  private worker: Worker;
  private pending: Pending | null = null;
  private sequence = 0;
  private disposed = false;
  private readyResolve!: () => void;
  private readyReject!: (error: Error) => void;
  private initTimer: ReturnType<typeof setTimeout>;
  readonly ready: Promise<void>;

  constructor(factory = () => new Worker('/sqlite-worker.js'), private queryTimeoutMs = 5000, initTimeoutMs = 15000) {
    this.worker = factory();
    this.ready = new Promise((resolve, reject) => { this.readyResolve = resolve; this.readyReject = reject; });
    this.initTimer = setTimeout(() => this.stop(new SqliteWorkerFailure('SQLite could not load within 15 seconds. Reset to retry.', true)), initTimeoutMs);
    this.worker.onmessage = (event) => {
      if (this.disposed) return;
      const message = event.data;
      if (message?.type === 'ready') {
        clearTimeout(this.initTimer);
        this.readyResolve();
      } else if (message?.type === 'init-error') {
        this.stop(new SqliteWorkerFailure(message.error || 'SQLite could not load.', true));
      } else if (this.pending && message?.id === this.pending.id) {
        const pending = this.pending;
        this.pending = null;
        clearTimeout(pending.timer);
        if (message.type === 'error') pending.reject(new SqliteWorkerFailure(message.error || 'Query failed.'));
        else if (message.type === 'result') pending.resolve(message.result);
        else { const error = new SqliteWorkerFailure('SQLite returned an invalid response.', true); pending.reject(error); this.stop(error); }
      }
    };
    this.worker.onerror = () => this.stop(new SqliteWorkerFailure('SQLite worker stopped unexpectedly. The in-memory database was discarded.', true));
  }

  async run(sql: string, fresh = false): Promise<SqliteReply> {
    await this.ready;
    if (this.disposed) throw new SqliteWorkerFailure('SQLite was reset.', true);
    if (this.pending) throw new SqliteWorkerFailure('A query is already running.');
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.stop(new SqliteWorkerFailure('Query stopped after 5 seconds. The in-memory database was discarded; load the sample or create your tables again.', true)), this.queryTimeoutMs);
      this.pending = { id, resolve, reject, timer };
      try { this.worker.postMessage({ id, sql, fresh }, []); }
      catch { this.stop(new SqliteWorkerFailure('SQLite could not receive the query. The database was discarded.', true)); }
    });
  }

  stop(error = new SqliteWorkerFailure('SQLite was reset.', true)) {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.initTimer);
    this.worker.terminate();
    this.readyReject(error);
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(error); this.pending = null; }
  }
}
