/**
 * Purpose: Verifies a logical export artifact by reading and counting all rows.
 */
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";

async function main() {
  const path = process.argv[2];
  if (!path) {
    throw new Error("Usage: npm run verify:postgres-backup -- <path-to-jsonl.gz>");
  }

  const counts: Record<string, number> = {};
  let buffer = "";

  await pipeline(
    createReadStream(path),
    createGunzip(),
    async function (source) {
      for await (const chunk of source) {
        buffer += chunk.toString("utf8");
        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex >= 0) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.trim()) {
            const parsed = JSON.parse(line) as { table?: string };
            if (!parsed.table) {
              throw new Error("Invalid backup line: missing table");
            }
            counts[parsed.table] = (counts[parsed.table] ?? 0) + 1;
          }
          newlineIndex = buffer.indexOf("\n");
        }
      }
    }
  );

  console.log(JSON.stringify({ ok: true, path, counts }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
