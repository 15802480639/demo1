import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSession } from '@/lib/auth';
import { getCsSession } from '@/lib/cs-auth';
import { resolveStaff } from '@/lib/chat-staff';

// GET /api/chat/ws-token —— 客服取一次性 WS 鉴权令牌
//
// 背景（2026-10-28）：
//   后台 WS 原本靠前端读 document.cookie 拿 ws_session 去鉴权，
//   但 ws_session 是 HttpOnly → 前端永远读不到 → 鉴权必失败 →
//   后台一直"连接中断，正在重连…"，红点/新消息全都不更新。
//
// 两条并行保障：
//   1) WS 进程在握手阶段解析 Upgrade 请求的 Cookie 自验签（不依赖前端）
//   2) 本接口签发 60 秒短时令牌，前端在 auth 消息里带上（兜底，
//      兼容某些代理不转发 Cookie 的情况）
//
// 2026-10-29：H5 客服上线后同时支持两类客服身份 ——
//   admin（后台 ws_session）与 agent（H5 cs_session），各自签发对应角色的令牌。
const SECRET = process.env.AUTH_SECRET ?? 'dev-insecure-secret-change-me';
const TTL_MS = 60 * 1000;

function sign(data: string): string {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

function issue(payloadObj: Record<string, unknown>) {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export async function GET() {
  // 后台管理员
  const session = await getSession();
  if (session && session.role === 'admin') {
    return NextResponse.json({
      token: issue({
        id: session.id,
        role: 'admin',
        scope: 'chat-ws',
        exp: Date.now() + TTL_MS,
      }),
      expiresIn: TTL_MS / 1000,
      role: 'admin',
    });
  }

  // H5 客服
  const cs = await getCsSession();
  if (cs) {
    const staff = await resolveStaff();
    if (staff && staff.kind === 'agent') {
      return NextResponse.json({
        token: issue({
          id: staff.agentId,
          role: 'agent',
          scope: 'chat-ws',
          exp: Date.now() + TTL_MS,
        }),
        expiresIn: TTL_MS / 1000,
        role: 'agent',
      });
    }
  }

  return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
}
