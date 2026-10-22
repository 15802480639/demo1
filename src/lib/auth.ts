// 鉴权核心 —— 自包含、零额外依赖（仅用 Node 内置 crypto + bcryptjs）
// 会话用 HMAC-SHA256 签名的无状态 token 存入 httpOnly cookie。
import crypto from 'crypto';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE = 'ws_session';
const SECRET = process.env.AUTH_SECRET ?? 'dev-insecure-secret-change-me';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 天

export type SessionUser = {
  id: string;
  username?: string | null;
  name: string | null;
  email: string | null; // 邮箱选填后可为空
  role: string; // customer | admin
};

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string): string {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

export function createSessionToken(user: SessionUser): string {
  const payload = b64url(JSON.stringify({ ...user, iat: Date.now() }));
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): SessionUser | null {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (sign(payload) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      const { iat, ...user } = data;
      // 邮箱选填后可为空，只要有 id 就是有效会话
      if (!user.id) return null;
      return user as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export function sessionCookieOpts(secure?: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE,
    // ⚠️ 关键：Secure 跟随真实访问协议，不能无脑 production 就开。
    // 当前站点用 IP 直连（http://8.217.66.83）尚未上 HTTPS，
    // 若在这里强制 secure=true，浏览器会在 http 上下文拒绝保存该 cookie，
    // 登录接口返回 ok 但 session 存不进去 → 一进后台就被踢回登录页。
    // 正确做法：nginx 已传 X-Forwarded-Proto，https 才带 Secure，http 不带。
    secure: secure ?? process.env.NODE_ENV === 'production',
  };
}

/** 从请求里判断客户端到底用 https 还是 http 访问（跟 nginx 的 X-Forwarded-Proto 对齐） */
export function isSecureRequest(req: Request): boolean {
  const proto = req.headers.get('x-forwarded-proto');
  if (proto) return proto.split(',')[0].trim() === 'https';
  // 兜底：直连（没走 nginx）时看 URL 协议
  try {
    const url = new URL(req.url);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

// 便捷守卫
/**
 * 带 HTTP 状态码的鉴权错误。
 * ⚠️ 2026-10-20：以前鉴权失败是裸 throw Error → Next.js 兜成 **500**，
 * 本地调试时极易误判成「服务器炸了」（真实案例：Playwright 因 Secure cookie
 * 拒收导致 500，排查了半天业务逻辑）。现在改为 401/403，语义正确。
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export async function requireUser(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) throw new HttpError(401, 'UNAUTHENTICATED');
  return s;
}

export async function requireAdmin(): Promise<SessionUser> {
  const s = await requireUser();
  if (s.role !== 'admin') throw new HttpError(403, 'FORBIDDEN');
  return s;
}

export { prisma };
