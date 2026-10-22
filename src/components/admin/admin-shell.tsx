'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/components/i18n/locale-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { getDictionary } from '@/i18n/dictionaries';
import type { AdminDict } from '@/i18n/dictionaries';

export function AdminShell({
  user,
  children,
}: {
  user: { email: string | null; name: string | null; username?: string | null };
  children: React.ReactNode;
}) {
  const { locale } = useLocale();
  // 后台界面固定中文（2026-10-10 子建要求：后台显示的英文全部改成中文）
  const t = getDictionary('zh').admin;
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const NAV: { href: string; label: string; exact?: boolean }[] = [
    { href: '/admin', label: t.dashboard, exact: true },
    { href: '/admin/categories', label: t.categories },
    { href: '/admin/brands', label: t.brands },
    { href: '/admin/products', label: t.products },
    { href: '/admin/orders', label: t.orders },
    { href: '/admin/coupons', label: t.coupons },
    { href: '/admin/newsletter', label: '订阅列表' },
    { href: '/admin/customers', label: t.customers },
    { href: '/admin/banners', label: t.banners },
    { href: '/admin/content', label: t.siteContent },
    { href: '/admin/seo', label: t.seo },
    { href: '/admin/geo', label: t.geo },
    { href: '/admin/geo-audit', label: t.geoAudit },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === `/${locale}${href}` : pathname.startsWith(`/${locale}${href}`);

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <aside className="w-60 shrink-0 bg-ink text-bg p-5 hidden md:block sticky top-0 h-screen overflow-y-auto">
        <Link href={`/${locale}`} className="block mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/jnd-logo-white.png" alt="J&D" width={120} height={61} className="h-9 w-auto" />
        </Link>
        <div className="text-[10px] tracking-[0.3em] text-accent mb-8">{t.console}</div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={`/${locale}${n.href}`}
              className={`block px-3 py-2.5 text-sm transition-all duration-200 border-l-2 ${
                isActive(n.href, n.exact)
                  ? 'border-accent bg-bg/10 text-bg'
                  : 'border-transparent text-bg/70 hover:bg-bg/[0.06] hover:text-bg hover:border-bg/30'
              }`}
            >
              {n.label}
            </Link>
          ))}
          <Link
            href={`/${locale}`}
            className="block px-3 py-2.5 text-sm text-bg/50 hover:text-bg transition mt-4 border-l-2 border-transparent hover:border-bg/30"
          >
            ← {t.backToStore}
          </Link>
        </nav>
      </aside>

      {/* 移动端：顶部横向导航（避免侧栏 hidden 后无法导航） */}
      <div className="md:hidden w-full border-b border-line bg-ink text-bg px-4 py-3">
        <Link href={`/${locale}`} className="block mb-2 w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/jnd-logo-white.png" alt="J&D" width={120} height={61} className="h-8 w-auto" />
        </Link>
        <div className="flex flex-wrap gap-1.5">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={`/${locale}${n.href}`}
              className={`rounded px-2.5 py-1.5 text-xs transition ${
                isActive(n.href, n.exact) ? 'bg-accent text-white' : 'text-bg/70'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line px-6 py-3 bg-surface/90 backdrop-blur">
          <div className="text-sm text-muted md:hidden">
            <span className="text-accent tracking-widest text-xs">{t.console}</span>
          </div>
          <div className="flex-1" />
          <span className="text-sm text-ink-soft mr-4 hidden sm:inline">
            {user.name || user.username || user.email || '管理员'}
          </span>
          <button
            onClick={() => logout().then(() => router.push(`/${locale}/admin/login`))}
            className="text-xs tracking-wide px-3 py-1.5 border border-line hover:border-ink transition-colors"
          >
            {t.logout}
          </button>
        </div>
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
