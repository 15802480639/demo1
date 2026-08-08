import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// 生产/部署使用 PostgreSQL（Supabase / Neon / 本机 PG）。
// DATABASE_URL 由环境变量提供：本地开发填 Supabase 连接串，Vercel 部署时在环境变量中设置。
// 旧的本地 SQLite(libSQL) + 文件复制/心跳 hack 已移除 —— serverless 环境无法写本地文件，必须用托管数据库。
const url = process.env.DATABASE_URL as string;

// 开发态热重载时复用同一 PrismaClient，避免连接数耗尽。
const g = globalThis as any;
const adapter = new PrismaPg({ connectionString: url });
const prisma =
  g.__wsPrisma ?? (g.__wsPrisma = new PrismaClient({ adapter }));

export { prisma };
