import { PrismaClient } from "@prisma/client";

// 标准 PrismaClient（本地 SQLite / 部署到 ECS 单实例）。
// DATABASE_URL 由 .env 提供，如 file:./dev.db
const g = globalThis as any;
export const prisma =
  g.__wsPrisma ?? (g.__wsPrisma = new PrismaClient());
