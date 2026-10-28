import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// 生产/部署使用 PostgreSQL（Supabase / Neon / 本机 PG）。
// DATABASE_URL 由环境变量提供：本地开发填 Supabase 连接串，Vercel 部署时在环境变量中设置。
// 旧的本地 SQLite(libSQL) + 文件复制/心跳 hack 已移除 —— serverless 环境无法写本地文件，必须用托管数据库。
//
// ⚠️ 关键修复：pg 的 connectionString 解析器对含百分号(%)的密码会整体解析失败
// （password/user/host/database 全部为 undefined），导致 SASL 报 "client password must be a string"。
// 因此改用 Node 原生 URL 解析出各分段，解码后作为 string 直接传给 PrismaPg，绕过 connectionString 解析。
const rawUrl = process.env.DATABASE_URL as string;
const parsedUrl = new URL(rawUrl);
const adapter = new PrismaPg({
  host: parsedUrl.hostname,
  port: Number(parsedUrl.port || 5432),
  user: decodeURIComponent(parsedUrl.username),
  password: decodeURIComponent(parsedUrl.password),
  database: parsedUrl.pathname.replace(/^\//, ""),
});

// 开发态热重载时复用同一 PrismaClient，避免连接数耗尽。
const g = globalThis as any;
const prisma =
  g.__wsPrisma ?? (g.__wsPrisma = new PrismaClient({ adapter }));

export { prisma };
