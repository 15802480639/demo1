// 客服身份解析 + 未读游标计算（后台管理员与 H5 客服共用同一套逻辑）
//
// 为什么要有 staffId 概念：
//   后台管理员（admin:<userId>）与 H5 客服（agent:<agentId>）是两类独立身份，
//   但它们接待的是同一批会话。未读数必须按人各算各的 —— 否则 A 看了，B 的红点也消失。
//   所以已读进度记在 ChatReadCursor(conversationId, staffId) 里，用 seq 单调序号定位。
//
// ⭐ 为什么不再用 ChatMessage.read 布尔字段算未读：
//   那是"全局已读"语义，任何人读了所有人的红点都消失（这正是旧版的 bug）。
//   read 字段保留原语义（访客侧判断"客服已读"仍依赖它），但未读计数改走游标。
import { prisma } from '@/lib/prisma';
import { getSession, HttpError } from '@/lib/auth';
import { getCsSession } from '@/lib/cs-auth';

export type Staff = {
  /** admin | agent */
  kind: 'admin' | 'agent';
  /** 身份键：admin:<User.id> 或 agent:<ChatAgent.id> —— 已读游标的分区键 */
  staffId: string;
  /** 后台管理员的 User.id */
  userId?: string;
  /** H5 客服的 ChatAgent.id */
  agentId?: string;
  displayName: string;
  username?: string | null;
};

/**
 * 解析当前请求的客服身份。
 * 优先级：cs_session（H5 客服）→ ws_session 且 role=admin（后台管理员）。
 * 返回 null 表示未登录或账号已停用。
 */
export async function resolveStaff(): Promise<Staff | null> {
  // ① H5 客服：cs_session + ChatAgent 表（停用即刻失效）
  const cs = await getCsSession();
  if (cs) {
    const agent = await prisma.chatAgent.findUnique({
      where: { id: cs.id },
      select: { id: true, username: true, displayName: true, active: true },
    });
    if (agent?.active) {
      return {
        kind: 'agent',
        staffId: `agent:${agent.id}`,
        agentId: agent.id,
        displayName: agent.displayName,
        username: agent.username,
      };
    }
  }

  // ② 后台管理员：ws_session 且 role=admin
  const s = await getSession();
  if (s && s.role === 'admin') {
    return {
      kind: 'admin',
      staffId: `admin:${s.id}`,
      userId: s.id,
      displayName: s.name || s.username || s.email || 'Admin',
      username: s.username ?? null,
    };
  }
  return null;
}

/** 客服守卫：未登录 → 401 */
export async function requireStaff(): Promise<Staff> {
  const st = await resolveStaff();
  if (!st) throw new HttpError(401, 'UNAUTHENTICATED');
  return st;
}

/**
 * 按客服统计未读数：某会话中 seq 大于该客服已读游标的访客消息条数。
 * 返回 conversationId → 未读条数。
 */
export async function unreadByStaff(
  conversationIds: string[],
  staffId: string
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!conversationIds.length) return out;
  const rows = await prisma.$queryRaw<{ conversationId: string; n: number }[]>`
    SELECT m."conversationId",
           COUNT(*)::int AS n
    FROM "ChatMessage" m
    LEFT JOIN "ChatReadCursor" c
           ON c."conversationId" = m."conversationId" AND c."staffId" = ${staffId}
    WHERE m."conversationId" = ANY(${conversationIds}::text[])
      AND m."sender" = 'visitor'
      AND m."seq" > COALESCE(c."lastReadSeq", 0)
    GROUP BY m."conversationId"
  `;
  for (const r of rows) out.set(r.conversationId, r.n);
  return out;
}

/** 某会话中最大的消息序号（游标推进目标） */
export async function maxSeqOf(conversationId: string): Promise<number> {
  const [row] = await prisma.$queryRaw<{ max: number | null }[]>`
    SELECT MAX("seq")::int AS max FROM "ChatMessage" WHERE "conversationId" = ${conversationId}
  `;
  return row?.max ?? 0;
}

/**
 * 推进已读游标到该会话当前最大 seq。
 * 用 GREATEST 保证只进不退（多端并发时不会把游标拉回去）。
 */
export async function advanceReadCursor(conversationId: string, staffId: string): Promise<void> {
  const max = await maxSeqOf(conversationId);
  if (max <= 0) return;
  await prisma.$executeRaw`
    INSERT INTO "ChatReadCursor" ("id", "conversationId", "staffId", "lastReadSeq", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, ${conversationId}, ${staffId}, ${max}, now(), now())
    ON CONFLICT ("conversationId", "staffId")
    DO UPDATE SET "lastReadSeq" = GREATEST("ChatReadCursor"."lastReadSeq", EXCLUDED."lastReadSeq"),
                  "updatedAt" = now()
  `;
}
