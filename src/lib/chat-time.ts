// 聊天模块时间戳统一出口 —— 解决"同一时刻不同接口返回差 9 小时"的问题
//
// 背景（2026-10-28 实测）：
//   ChatMessage/ChatConversation 的时间列已改为 timestamptz（存绝对时刻）。
//   但不同驱动读取同一列的语义不同：
//     - node-pg：按驱动进程本地时区解析 → 得到正确的绝对时刻
//     - Prisma 7 + @prisma/adapter-pg：把 timestamptz 当作"会话时区壁钟"解读 →
//       实测比真实时刻多 9 小时（库会话时区 Asia/Seoul）
//   于是 WS 推送的 createdAt 与 REST 返回的 createdAt 不一致，前端排序彻底错乱。
//
// 对策：不再依赖驱动解析时间戳，统一在 SQL 层用 to_char(... AT TIME ZONE 'UTC')
//       生成 UTC ISO 字符串（Prisma $queryRaw 原样返回字符串，不做任何时区转换）。
//       所有对外输出的 createdAt / lastMessageAt 必须是这个格式。

import { Prisma } from '@prisma/client';

/**
 * 生成一个 Prisma SQL 片段：把 timestamptz 列转成 UTC ISO 字符串。
 * 用于 $queryRaw 的模板插值（Prisma.sql / Prisma.raw 均不会对列名做转义，
 * 这里的列名是代码内写死的常量，非用户输入，无注入风险）。
 */
export function isoUtcSql(col: string) {
  return Prisma.sql`to_char(${Prisma.raw(col)} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
}

/** 统一的 ISO 字符串格式化（用于内存中的 Date 对象） */
export function isoUtc(d: Date | string): string {
  if (typeof d === 'string') return d;
  return d.toISOString();
}
