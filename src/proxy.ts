import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from '@/i18n/config';

function detectLocale(request: NextRequest): string {
  const accept = request.headers.get('accept-language');
  if (accept) {
    const preferred = accept
      .split(',')[0]
      .split('-')[0]
      .toLowerCase();
    if ((locales as readonly string[]).includes(preferred)) return preferred;
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );

  // ⚠️ H5 客服台（/cs）刻意不带语言前缀 —— 它是客服内部工具，
  //   固定中文界面、与商城前台完全隔离（不继承顶栏/底栏/浮窗）。
  //   若在这里加语言前缀 → /cs 会被改写成 /ko/cs（该路由不存在）→ 404。
  //   必须原样放行。
  if (pathname === '/cs' || pathname.startsWith('/cs/')) {
    const csHeaders = new Headers(request.headers);
    csHeaders.set('x-ws-locale', detectLocale(request));
    return NextResponse.next({ request: { headers: csHeaders } });
  }

  // 2026-10-19：把当前语种写进请求头。
  // not-found.tsx 这类拿不到 params 的组件靠它反推 locale，
  // 否则三语站的 404 会恒显默认语种（next-url/referer 都不可靠）。
  const seg = pathname.split('/').filter(Boolean)[0];
  const locale = (locales as readonly string[]).includes(seg)
    ? seg
    : detectLocale(request);
  const reqHeaders = new Headers(request.headers);
  reqHeaders.set('x-ws-locale', locale);

  if (hasLocale) return NextResponse.next({ request: { headers: reqHeaders } });

  request.nextUrl.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Skip Next internals, API routes, and static files
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[\\w]+$).*)',
  ],
};
