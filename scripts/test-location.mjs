import fs from "fs";
import path from "path";
import Database from "libsql";

const src = "D:/LuoshenWorkspace/code/webshopp/prisma/dev.db";
const locs = [
  "D:/LuoshenWorkspace/_wsdb/dev.db",
  "C:/Users/Administrator/AppData/Local/webshopp-data/dev.db",
  "D:/_wsdb_tmp/dev.db",
];

for (const p of locs) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.copyFileSync(src, p);
    console.log("copy ok ->", p);
  } catch (e) {
    console.log("copy fail", p, e.message);
  }
}

function t(p) {
  try {
    const db = new Database(p);
    db.exec("CREATE TABLE IF NOT EXISTS __w(id INTEGER)");
    db.exec("DROP TABLE __w");
    db.close();
    return "OK";
  } catch (e) {
    return "RO:" + e.message;
  }
}

for (const p of locs) console.log("立即", p, t(p));
setTimeout(() => {
  console.log("--- 8秒后(验证 WorkBuddy/索引是否锁定) ---");
  for (const p of locs) console.log("延迟", p, t(p));
}, 8000);
