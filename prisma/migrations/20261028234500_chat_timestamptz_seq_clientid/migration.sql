-- 修复聊天模块时间戳的时区歧义 + 增加幂等键与稳定排序键
--
-- 背景（2026-10-28 实测）：
--   ChatMessage.createdAt 原本是 timestamp(3) without time zone（裸壁钟）。
--   Prisma 写入时用 UTC 壁钟，原生 SQL now() 写入时用会话时区(Asia/Seoul)壁钟，
--   同一列混着两套基准；读取时 Prisma 按 UTC 解读、node-pg 按本地时区解读，
--   导致 WS 推送与 REST 返回的 createdAt 相差 8 小时，前端消息排序完全错乱。
--
-- 处理：
--   1) 全部时间列改为 timestamptz（带时区，存绝对时刻），读写基准唯一。
--   2) 存量裸 timestamp 按 UTC 基准解释转为 timestamptz（Prisma 写入的那部分）。
--      注：本地开发库中 node-pg 写入的行是 KST 壁钟，属于测试数据，不影响线上；
--      线上库该表当时尚未部署，按 UTC 解释即为正确基准。
--   3) 新增 clientId（幂等键，WS 与 REST 双通道去重）与 seq（单调序号，稳定排序）。

-- ChatMessage: 新增 clientId + seq
ALTER TABLE "ChatMessage" ADD COLUMN "clientId" TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ChatMessage" ADD COLUMN "seq" SERIAL NOT NULL;

-- 幂等约束：同一会话内 clientId 唯一（配合应用层 ON CONFLICT 去重）
CREATE UNIQUE INDEX "ChatMessage_conversationId_clientId_key" ON "ChatMessage"("conversationId", "clientId");

-- ChatMessage 时间列 → timestamptz（按 UTC 壁钟解释存量裸值）
ALTER TABLE "ChatMessage"
  ALTER COLUMN "createdAt" TYPE timestamptz(3)
  USING ("createdAt" AT TIME ZONE 'UTC');

-- ChatConversation 时间列 → timestamptz
ALTER TABLE "ChatConversation"
  ALTER COLUMN "createdAt" TYPE timestamptz(3)
  USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "lastMessageAt" TYPE timestamptz(3)
  USING ("lastMessageAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE timestamptz(3)
  USING ("updatedAt" AT TIME ZONE 'UTC');

-- 稳定排序索引
CREATE INDEX "ChatMessage_conversationId_seq_idx" ON "ChatMessage"("conversationId", "seq");
