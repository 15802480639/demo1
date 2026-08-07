import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

// 本环境下（WorkBuddy 桌面端文件监视器 / Windows Defender）会对空闲的数据文件（.db 等）
// 持续加只读共享锁，导致新进程无法以读写方式打开（SQLITE_READONLY / EPERM）。
// 破解方法：
//   1) 每次启动都从「纯净种子库」(prisma/dev.db) 复制到一个【全新文件名】并立即以读写方式打开
//      -> 监视器尚未锁定该新文件，本进程抢到首个读写句柄；
//   2) 持有一个常驻活动连接 + 心跳写入，使文件永远“不空闲” -> 监视器不会施加只读锁。
// 这样既能写入，又能保证每次启动都有完整种子数据（演示用，重启即重置）。
// 全部使用同步 API，避免顶层 await（兼容 Next ESM 与 tsx/CommonJS 直接运行）。

let url = process.env.DATABASE_URL as string;

const g = globalThis as any;
if (!g.__wsUrl) {
  const filePath = url.startsWith("file:") ? url.slice(5) : url;
  const seedPath = path.resolve(process.cwd(), "prisma/dev.db");
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  // 全新文件名，避开监视器对旧文件的只读锁
  const newPath = path.join(dir, `webshopp.${Date.now()}.${process.pid}.db`);
  fs.copyFileSync(seedPath, newPath);
  url = "file:" + newPath;
  console.log("[prisma] 已基于种子库创建可写数据库:", url);
  g.__wsUrl = url;
} else {
  url = g.__wsUrl;
}

// 常驻活动连接：心跳写入，确保文件始终“活跃”，避免被加只读锁。
if (!g.__wsKeepAlive) {
  const keep: Client = createClient({ url });
  keep.execute({ sql: "PRAGMA journal_mode=WAL" }).catch(() => {});
  keep.execute({ sql: "PRAGMA foreign_keys=on" }).catch(() => {});
  const hb = setInterval(() => {
    keep.execute({ sql: "INSERT INTO __hb VALUES (?)" , args: [new Date().toISOString()] })
      .catch(() => {});
  }, 1500);
  if (typeof hb.unref === "function") hb.unref();
  g.__wsKeepAlive = keep;
}

const adapter = new PrismaLibSql({ url });

// 开发态热重载时复用同一 PrismaClient / 同一数据库文件，避免重复连接与数据重置。
const prisma =
  g.__wsPrisma ??
  (g.__wsPrisma = new PrismaClient({ adapter }));

export { prisma };
