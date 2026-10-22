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

export function sessionCookieOpts() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  };
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
