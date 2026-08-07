import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";

const src = "D:/LuoshenWorkspace/code/webshopp/prisma/dev.db";
const p = "D:/_wsdb_final/dev.db";
fs.mkdirSync(path.dirname(p), { recursive: true });
fs.copyFileSync(src, p);
console.log("已创建", p);

async function w(tag) {
  try {
    const c = createClient({ url: "file:" + p });
    await c.execute({ sql: "CREATE TABLE IF NOT EXISTS __w(id INTEGER)" });
    await c.execute({ sql: "DROP TABLE __w" });
    console.log(tag, "createClient 可写 OK");
  } catch (e) {
    console.log(tag, "createClient 只读:", e.message);
  }
}

await w("立即");
setTimeout(() => w("10秒后"), 10000);
