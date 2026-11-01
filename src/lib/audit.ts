// 管理员操作日志 —— 所有后台写操作的统一留痕出口
//
// ⭐ 为什么必须统一出口：
//   后台能改价、改库存、改订单状态、动积分、发券…出错时必须能追溯"谁干的"。
//   如果每个接口各自 prisma.auditLog.create，很快会出现漏记 / 字段缺失 / actor 为空。
//   所以统一走 logAudit()，由它负责补齐 actor / ip / 时间。
//
// ⚠️ 写日志绝不能影响主流程：
//   任何写日志的异常都必须被吞掉（返回 false），绝不能把成功的业务操作搞成 500。

import { prisma } from '@/lib/prisma';

export type AuditAction =
  | 'product.create'
  | 'product.update'
  | 'product.delete'
  | 'product.import'
  | 'category.create'
  | 'category.update'
  | 'category.delete'
  | 'brand.create'
  | 'brand.update'
  | 'brand.delete'
  | 'order.status.update'
  | 'order.logistics.update'
  | 'order.contacted.update'
  | 'order.export'
  | 'customer.update'
  | 'customer.points.adjust'
  | 'points.rule.update'
  | 'coupon.create'
  | 'coupon.update'
  | 'coupon.delete'
  | 'agent.create'
  | 'agent.update'
  | 'agent.delete'
  | 'staff.role.update'
  | 'content.update'
  | 'seo.update'
  | 'geo.update'
  | 'newsletter.send'
  | 'data.export';

export type AuditInput = {
  action: AuditAction | string;
  /** 操作人。系统自动触发可传 null */
  actor?: { id: string; name?: string | null; email?: string | null; role?: string | null } | null;
  targetType?: string;
  targetId?: string | null;
  /** 人类可读摘要，后台列表直接展示 */
  summary?: string;
  /** 变更详情（会被 JSON 序列化） */
  detail?: unknown;
  /** 来源 IP（从请求头取） */
  ip?: string | null;
};

/** 从 Request 里取客户端 IP（支持常见反代头） */
export function clientIp(req?: Request | null): string | null {
  if (!req) return null;
  const h = req.headers;
  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return h.get('x-real-ip') || h.get('cf-connecting-ip') || null;
}

/**
 * 写一条操作日志。
 * 返回是否写入成功（失败只记 console，不抛异常）。
 */
export async function logAudit(input: AuditInput): Promise<boolean> {
  try {
    const actorId = input.actor?.id ?? null;
    // 操作人名称/角色优先用调用方给的快照；没给就实时查一次库
    let actorName = input.actor?.name ?? '';
    let actorRole = input.actor?.role ?? '';
    if (actorId && (!actorName || !actorRole)) {
      const u = await prisma.user.findUnique({
        where: { id: actorId },
        select: { name: true, username: true, email: true, staffRole: true },
      });
      if (u) {
        actorName = actorName || u.name || u.username || u.email || '';
        actorRole = actorRole || u.staffRole || '';
      }
    }
    await prisma.auditLog.create({
      data: {
        actorId,
        actorName,
        actorRole,
        action: input.action,
        targetType: input.targetType ?? '',
        targetId: input.targetId ?? null,
        summary: input.summary ?? '',
        detail: safeJson(input.detail),
        ip: input.ip ?? null,
      },
    });
    return true;
  } catch (e) {
    // ⚠️ 吞掉异常：日志写失败不能影响业务操作
    console.error('[audit] write failed:', e instanceof Error ? e.message : e);
    return false;
  }
}

/** 安全 JSON 序列化（循环引用 / BigInt 都不该炸掉主流程） */
function safeJson(v: unknown): string {
  if (v === undefined || v === null) return '{}';
  try {
    return JSON.stringify(v, (_k, val) => {
      if (typeof val === 'bigint') return val.toString();
      return val;
    });
  } catch {
    return '{}';
  }
}

/** 从会话用户构造审计 actor */
export function actorFromSession(u: {
  id: string;
  name?: string | null;
  email?: string | null;
  staffRole?: string | null;
} | null): AuditInput['actor'] {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name ?? u.email ?? null,
    role: u.staffRole ?? '',
  };
}
