import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOpts, isSecureRequest } from '@/lib/auth';

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOpts(isSecureRequest(req)), maxAge: 0 });
  return res;
}
