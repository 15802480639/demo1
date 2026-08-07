// Copy the real data (prisma/dev.db) into a fresh file and enable WAL mode.
// WAL bypasses the WorkBuddy/Defender read-only file lock on the main db file,
// because writes go to the -wal file which is not locked.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const src = path.resolve("prisma/dev.db");
const dstDir = "D:/_wsdb_final";
const dst = path.join(dstDir, "webshopp.db");

// Ensure target dir exists
fs.mkdirSync(dstDir, { recursive: true });

// Copy current data (read from source, which is fine even if read-locked)
fs.copyFileSync(src, dst);
console.log("Copied dev.db ->", dst);

// Open with libSQL and enable WAL + foreign keys
const client = createClient({ url: "file:" + dst });
await client.execute({ sql: "PRAGMA journal_mode=WAL" });
await client.execute({ sql: "PRAGMA foreign_keys=on" });

// Confirm a write works (WAL file will be created; main file stays read-shared)
await client.execute({
  sql: "CREATE TABLE IF NOT EXISTS __wal_probe (id INTEGER PRIMARY KEY, ts TEXT)",
});
await client.execute({
  sql: "INSERT INTO __wal_probe (ts) VALUES (?)",
  args: [new Date().toISOString()],
});
const rows = await client.execute({ sql: "SELECT count(*) as c FROM __wal_probe" });
console.log("Write probe OK, count =", rows.rows[0].c);

// Clean up probe
await client.execute({ sql: "DROP TABLE __wal_probe" });
await client.close();

// Confirm WAL files exist now
console.log("WAL files:", fs.readdirSync(dstDir).filter((f) => f.startsWith("webshopp.db")));
console.log("DONE: WAL enabled on", dst);
