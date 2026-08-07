// Recreate webshopp.db fresh (copy real data + WAL), then keep an ACTIVE
// connection with a heartbeat write every 2s so the file never goes idle.
// Per diagnosis: an idle file gets locked read-only by the watcher/Defender,
// but a file held by an active connection is never locked -> writes succeed.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const src = path.resolve("prisma/dev.db");
const dstDir = "D:/_wsdb_final";
const dst = path.join(dstDir, "webshopp.db");
fs.mkdirSync(dstDir, { recursive: true });

// Remove old WAL siblings if present (best effort)
for (const s of ["", "-wal", "-shm", "-journal"]) {
  try { fs.rmSync(dst + s, { force: true }); } catch {}
}
fs.copyFileSync(src, dst);
console.log("recreated", dst);

const client = createClient({ url: "file:" + dst });
await client.execute({ sql: "PRAGMA journal_mode=WAL" });
await client.execute({ sql: "PRAGMA foreign_keys=on" });
await client.execute({ sql: "CREATE TABLE IF NOT EXISTS __hb(ts TEXT)" });

let n = 0;
setInterval(async () => {
  try {
    await client.execute({ sql: "INSERT INTO __hb VALUES (?)" , args: [new Date().toISOString()] });
    n++;
    if (n % 5 === 0) console.log("heartbeat ok x" + n);
  } catch (e) {
    console.log("heartbeat ERR", e.message);
  }
}, 2000);

console.log("KEEPER active on", dst);
// keep process alive
process.stdin.resume();
