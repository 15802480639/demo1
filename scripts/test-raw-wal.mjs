import { createClient } from "@libsql/client";
import fs from "node:fs";

const url = "file:D:/_wsdb_final/webshopp.db";

// Check WAL files present
const dir = "D:/_wsdb_final";
console.log("Files:", fs.readdirSync(dir).filter((f) => f.startsWith("webshopp.db")));

const c = createClient({ url });
const jm = await c.execute({ sql: "PRAGMA journal_mode" });
console.log("journal_mode =", jm.rows[0].journal_mode);
try {
  await c.execute({ sql: "CREATE TABLE IF NOT EXISTS __p(id INTEGER)" });
  await c.execute({ sql: "INSERT INTO __p VALUES (1)" });
  const r = await c.execute({ sql: "SELECT count(*) c FROM __p" });
  console.log("RAW createClient WRITE OK count=", r.rows[0].c);
  await c.execute({ sql: "DROP TABLE __p" });
} catch (e) {
  console.log("RAW WRITE ERR:", e.message);
}
await c.close();
