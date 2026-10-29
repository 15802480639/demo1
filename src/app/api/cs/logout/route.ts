import { NextResponse } from 'next/server';
import { CS_SESSION_COOKIE } from '@/lib/cs-auth';

// POST /api/cs/logout —— H5 客服登出（清 Cookie）
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CS_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
