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
  name: string | null;
  email: string;
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
    if (!user.id || !user.email) return null;
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
export async function requireUser(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) throw new Error('UNAUTHENTICATED');
  return s;
}

export async function requireAdmin(): Promise<SessionUser> {
  const s = await requireUser();
  if (s.role !== 'admin') throw new Error('FORBIDDEN');
  return s;
}

export { prisma };
