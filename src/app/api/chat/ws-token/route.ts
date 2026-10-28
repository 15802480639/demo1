import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSession, requireAdmin, HttpError } from '@/lib/auth';

// GET /api/chat/ws-token —— 后台客服取一次性 WS 鉴权令牌
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
const SECRET = process.env.AUTH_SECRET ?? 'dev-insecure-secret-change-me';
const TTL_MS = 60 * 1000;

function sign(data: string): string {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const payload = Buffer.from(
    JSON.stringify({
      id: session.id,
      role: 'admin',
      scope: 'chat-ws',
      exp: Date.now() + TTL_MS,
    })
  ).toString('base64url');

  return NextResponse.json({
    token: `${payload}.${sign(payload)}`,
    expiresIn: TTL_MS / 1000,
  });
}
