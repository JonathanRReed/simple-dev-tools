import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);

test("prepared SQL.js assets contain a matching WASM runtime that runs the playground sample", async () => {
  const output = await mkdtemp(join(tmpdir(), "sdt-sqljs-"));
  try {
    const preparation = spawnSync("node", ["scripts/prepare-sqljs.mjs", output], {
      cwd: new URL("..", import.meta.url),
      encoding: "utf-8",
    });
    expect(preparation.status).toBe(0);

    const packageDirectory = new URL("../", import.meta.resolve("sql.js/dist/sql-wasm.js"));
    for (const file of ["sql-wasm.js", "sql-wasm.wasm", "LICENSE"]) {
      const source = file === "LICENSE" ? file : `dist/${file}`;
      expect(await readFile(join(output, file))).toEqual(await readFile(new URL(source, packageDirectory)));
    }

    const wasm = await readFile(join(output, "sql-wasm.wasm"));
    expect(WebAssembly.validate(wasm)).toBe(true);
    const initSqlJs = require(join(output, "sql-wasm.js"));
    const SQL = await initSqlJs({ wasmBinary: wasm });
    const database = new SQL.Database();
    try {
      const client = await readFile(new URL("../src/app/sqlite/SQLiteClient.tsx", import.meta.url), "utf-8");
      const sample = client.match(/const SAMPLE_SQL = `([\s\S]*?)`;/)?.[1];
      expect(sample).toBeDefined();
      const results = database.exec(sample);
      expect(results[0].columns).toEqual(["id", "name", "email", "age", "active"]);
      expect(results[0].values).toHaveLength(4);
      expect(results[0].values[0]).toEqual([1, "Ada Lovelace", "ada@example.com", 36, 1]);
      expect(results[0].values[3]).toEqual([4, "Katherine J.", null, null, 1]);
    } finally {
      database.close();
    }
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
