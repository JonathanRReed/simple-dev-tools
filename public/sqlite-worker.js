/* global importScripts, initSqlJs */
let SQL;
let database;
const MAX_ROWS = 10000;
const MAX_RESULTS = 20;
const MAX_BYTES = 4 * 1024 * 1024;

function newDatabase() {
  database?.close();
  database = new SQL.Database();
  database.exec('PRAGMA hard_heap_limit = 67108864;');
}

self.onmessage = ({ data }) => {
  const { id, sql, fresh } = data;
  try {
    if (!database) throw new Error('SQLite is not ready.');
    if (typeof sql !== 'string' || sql.length > 1000000) throw new Error('Keep SQL input below one million characters.');
    if (fresh) newDatabase();
    const before = database.exec('SELECT total_changes()')[0].values[0][0];
    const results = [];
    let changed = 0, sawWrite = false, rows = 0, bytes = 0, statements = 0, truncated = false;
    for (const statement of database.iterateStatements(sql)) {
      try {
        if (++statements > 100 || results.length >= MAX_RESULTS) { truncated = true; break; }
        const columns = statement.getColumnNames();
        if (columns.length > 256) throw new Error('Result exceeds the 256-column limit.');
        if (columns.length) {
          const values = [];
          while (statement.step()) {
            const row = statement.get();
            bytes += row.reduce((size, cell) => size + (typeof cell === 'string' ? cell.length * 2 : cell instanceof Uint8Array ? cell.byteLength : 8), 0);
            if (rows >= MAX_ROWS || bytes > MAX_BYTES) { truncated = true; break; }
            values.push(row);
            rows++;
          }
          results.push({ columns, values });
        } else {
          statement.step();
          sawWrite = true;

        }
        if (truncated) break;
      } finally { statement.free(); }
    }
    changed = database.exec('SELECT total_changes()')[0].values[0][0] - before;
    sawWrite = sawWrite || changed > 0;
    self.postMessage({ type: 'result', id, result: { results, changed, sawWrite, truncated } });
  } catch (error) {
    self.postMessage({ type: 'error', id, error: error instanceof Error ? error.message : String(error) });
  }
};

try {
  importScripts('/sqljs/sql-wasm.js');
  initSqlJs({ locateFile: file => `/sqljs/${file}` }).then(module => {
    SQL = module;
    newDatabase();
    self.postMessage({ type: 'ready' });
  }).catch(error => self.postMessage({ type: 'init-error', error: error.message }));
} catch (error) {
  self.postMessage({ type: 'init-error', error: error.message });
}
