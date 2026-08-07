import { createClient } from "@libsql/client";
import Database from "libsql";
import fs from "fs";

const base = "D:/LuoshenWorkspace/code/webshopp/prisma/";
const clean = base + "dev.db.clean";
fs.copyFileSync(base + "dev.db.new", clean); // 全新文件,无任何进程持有
console.log("已创建全新文件:", clean);

// 对照组 A: 裸绝对路径
try {
  const db = new Database(clean);
  db.exec("CREATE TABLE IF NOT EXISTS __w(id INTEGER)");
  db.exec("DROP TABLE __w");
  db.close();
  console.log("A 裸路径 可写 OK");
} catch (e) {
  console.log("A 裸路径 只读:", e.message);
}

// 对照组 B: 经由 createClient 的 file: URL(应用实际走的路径)
try {
  const c = createClient({ url: "file:" + clean });
  await c.execute({ sql: "CREATE TABLE IF NOT EXISTS __w(id INTEGER)" });
  await c.execute({ sql: "DROP TABLE __w" });
  console.log("B file:URL 可写 OK");
} catch (e) {
  console.log("B file:URL 只读:", e.message);
}
