import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOpts } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOpts(), maxAge: 0 });
  return res;
}
