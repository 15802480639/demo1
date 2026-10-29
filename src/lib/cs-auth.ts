// 客服（H5）独立鉴权层 —— 与商城 admin 体系完全隔离
//
// 设计要点：
//  - 独立的 Cookie（cs_session），与后台的 ws_session 互不影响：
//    同一台设备上既能登后台又能登客服台，不会互相挤掉会话。
//  - 独立的账号表 ChatAgent，与商城 User 表零交集：
//    客服账号进不去 /admin 后台，也进不去商城前台下单。
//  - 签名算法沿用 AUTH_SECRET 的 HMAC-SHA256，但 payload 带 scope 标记，
//    防止 ws_session 的令牌被当成 cs_session 使用（跨体系令牌重放）。
//  - 未读游标按 staffId 隔离：agent:<客服id> 或 admin:<管理员id>。
import crypto from 'crypto';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

/** 客服会话 Cookie 名（必须与 server/ws-server.mjs 的 CS_SESSION_COOKIE 一致） */
export const CS_SESSION_COOKIE = 'cs_session';
/** 令牌作用域标记：与后台的 ws_session 区分，杜绝跨体系令牌重放 */
export const CS_TOKEN_SCOPE = 'cs-agent';
const SECRET = process.env.AUTH_SECRET ?? 'dev-insecure-secret-change-me';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 天

export type CsSessionUser = {
  id: string;
  username: string;
  displayName: string;
  scope: typeof CS_TOKEN_SCOPE;
  iat: number;
};

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string): string {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

export function createCsSessionToken(agent: { id: string; username: string; displayName: string }): string {
  const payload = b64url(
    JSON.stringify({
      id: agent.id,
      username: agent.username,
      displayName: agent.displayName,
      scope: CS_TOKEN_SCOPE,
      iat: Date.now(),
    })
  );
  return `${payload}.${sign(payload)}`;
}

export function verifyCsSessionToken(token: string | undefined): CsSessionUser | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = sign(payload);
  // 定长比较，避免时序侧信道
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    // ⭐ scope 校验：ws_session 的 payload 没有 scope 字段 → 这里直接判空拒掉
    if (data.scope !== CS_TOKEN_SCOPE) return null;
    if (!data.id || !data.username) return null;
    return data as CsSessionUser;
  } catch {
    return null;
  }
}

/** 读取当前客服会话（不校验账号是否仍 active —— 停用即刻生效由 API 层再查库） */
export async function getCsSession(): Promise<CsSessionUser | null> {
  const c = await cookies();
  return verifyCsSessionToken(c.get(CS_SESSION_COOKIE)?.value);
}

/** 客服身份键：用于已读游标隔离 */
export function csStaffId(agentId: string): string {
  return `agent:${agentId}`;
}

/** 后台管理员身份键（后台客服台也走游标制，未读数与 H5 互不干扰） */
export function adminStaffId(userId: string): string {
  return `admin:${userId}`;
}

/**
 * 客服守卫：必须是 ChatAgent 表里存在且 active 的账号。
 * 账号被后台停用后立刻失效（不依赖令牌过期）。
 */
export async function requireCsAgent(): Promise<CsSessionUser> {
  const s = await getCsSession();
  if (!s) throw new CsHttpError(401, 'UNAUTHENTICATED');
  const agent = await prisma.chatAgent.findUnique({
    where: { id: s.id },
    select: { id: true, active: true },
  });
  if (!agent) throw new CsHttpError(401, 'UNAUTHENTICATED');
  if (!agent.active) throw new CsHttpError(403, 'AGENT_DISABLED');
  return s;
}

/** 客服体系专用错误（与 admin 的 HttpError 分开，避免两套状态码语义混淆） */
export class CsHttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'CsHttpError';
  }
}

export function csSessionCookieOpts(secure?: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE,
    // ⚠️ Secure 跟随真实访问协议（与 src/lib/auth.ts 同一坑）：
    //    IP 直连 http 时强制 secure=true，浏览器会拒收 cookie → 登录成功但会话存不进去。
    secure: secure ?? process.env.NODE_ENV === 'production',
  };
}

export async function hashCsPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyCsPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}
