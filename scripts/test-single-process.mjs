import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

let url = process.env.DATABASE_URL;
const filePath = url.startsWith("file:") ? url.slice(5) : url;
const seedPath = path.resolve("prisma/dev.db");

async function ensureWritable() {
  const probe = createClient({ url });
  try {
    await probe.execute({ sql: "PRAGMA journal_mode=WAL" });
    await probe.execute({ sql: "CREATE TABLE IF NOT EXISTS __hb(ts TEXT)" });
    await probe.execute({ sql: "INSERT INTO __hb VALUES (?)" , args: ["x"] });
    await probe.execute({ sql: "DELETE FROM __hb" });
    console.log("existing file writable, keep it");
  } catch (e) {
    // 只读 -> 复制种子到一个全新的、监视器尚未锁定的文件名
    const dir = path.dirname(filePath);
    const uniq = `webshopp.${Date.now()}.${process.pid}.db`;
    const newPath = path.join(dir, uniq);
    fs.copyFileSync(seedPath, newPath);
    url = "file:" + newPath;
    console.log("recreated as", url);
    const c = createClient({ url });
    await c.execute({ sql: "PRAGMA journal_mode=WAL" });
    await c.execute({ sql: "PRAGMA foreign_keys=on" });
    await c.execute({ sql: "CREATE TABLE IF NOT EXISTS __hb(ts TEXT)" });
    try { c.close(); } catch {}
  } finally {
    try { probe.close(); } catch {}
  }
}
await ensureWritable();

const keep = createClient({ url });
keep.execute({ sql: "PRAGMA journal_mode=WAL" }).catch(() => {});
const hb = setInterval(() => {
  keep.execute({ sql: "INSERT INTO __hb VALUES (?)" , args: ["y"] }).catch(() => {});
}, 1500);
if (typeof hb.unref === "function") hb.unref();

const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

(async () => {
  try {
    const r = await prisma.$queryRawUnsafe("SELECT 1 AS ok");
    console.log("READ OK", JSON.stringify(r));
    await prisma.$executeRawUnsafe("CREATE TABLE IF NOT EXISTS __w(id INTEGER)");
    await prisma.$executeRawUnsafe("INSERT INTO __w VALUES (1)");
    const c = await prisma.$queryRawUnsafe("SELECT count(*) AS c FROM __w");
    await prisma.$executeRawUnsafe("DROP TABLE __w");
    console.log("WRITE OK via PrismaLibSql, count=", c[0].c);
    console.log("APPROACH WORKS in single process");
  } catch (e) {
    console.log("ERR", e.message);
  }
  await prisma.$disconnect();
  try { keep.close(); } catch {}
  process.exit(0);
})();
