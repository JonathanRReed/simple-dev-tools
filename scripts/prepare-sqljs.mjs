import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const source = dirname(require.resolve("sql.js/dist/sql-wasm.js"));
const destination = process.argv[2]
  ? resolve(process.argv[2])
  : fileURLToPath(new URL("../public/sqljs/", import.meta.url));

await mkdir(destination, { recursive: true });
await Promise.all(
  ["sql-wasm.js", "sql-wasm.wasm", "LICENSE"].map((file) =>
    copyFile(join(source, file === "LICENSE" ? "../LICENSE" : file), join(destination, file))
  )
);
