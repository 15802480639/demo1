'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/components/i18n/locale-provider';
import { useAuth } from '@/components/auth/auth-provider';
import type { Locale } from '@/i18n/config';
import type { AdminDict } from '@/i18n/dictionaries';
import type { Permission } from '@/lib/permissions';
import { STAFF_ROLE_LABELS, normalizeStaffRole } from '@/lib/permissions';
import { AdminBell } from '@/components/admin/admin-bell';

export function AdminShell({
  user,
  permissions,
  children,
}: {
  user: {
    email: string | null;
    name: string | null;
    username?: string | null;
    role?: string | null;
  };
  /** 当前管理员的权限点列表（服务端实时查库后传入） */
  permissions: Permission[];
  children: React.ReactNode;
}) {
  const { locale, dict } = useLocale();
  const t = dict.admin;
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const NAV: { href: string; label: string; exact?: boolean; perm?: Permission }[] = [
    { href: '/admin', label: t.dashboard, exact: true },
    { href: '/admin/categories', label: t.categories, perm: 'products.view' },
    { href: '/admin/brands', label: t.brands, perm: 'products.view' },
    { href: '/admin/products', label: t.products, perm: 'products.view' },
    { href: '/admin/orders', label: t.orders, perm: 'orders.view' },
    { href: '/admin/consultations', label: t.navConsultations, perm: 'consultations.view' },
    { href: '/admin/coupons', label: t.coupons, perm: 'coupons.edit' },
    { href: '/admin/points', label: t.pointSettings, perm: 'points.view' },
    { href: '/admin/newsletter', label: t.navNewsletter, perm: 'newsletter.edit' },
    { href: '/admin/customers', label: t.customers, perm: 'customers.view' },
    { href: '/admin/referrals', label: t.referrals, perm: 'referrals.view' },
    { href: '/admin/banners', label: t.banners, perm: 'content.edit' },
    { href: '/admin/content', label: t.siteContent, perm: 'content.edit' },
    { href: '/admin/seo', label: t.seo, perm: 'seo.edit' },
    { href: '/admin/geo', label: t.geo, perm: 'geo.edit' },
    { href: '/admin/geo-audit', label: t.geoAudit, perm: 'geo.edit' },
    { href: '/admin/chat', label: t.imTitle, perm: 'chat.view' },
    { href: '/admin/support-agents', label: t.saTitle, perm: 'agents.manage' },
    { href: '/admin/reports', label: t.navReports, perm: 'reports.view' },
    { href: '/admin/audit-logs', label: t.navAuditLogs, perm: 'audit.view' },
    { href: '/admin/staff', label: t.navStaff, perm: 'staff.manage' },
  ];

  // 按权限过滤菜单：无权限的模块直接不渲染（前端过滤只是体验，
  // 真正的安全边界在服务端 requirePermission 校验）
  const visibleNav = useMemo(() => {
    if (!permissions || permissions.length === 0) return NAV;
    return NAV.filter((n) => !n.perm || permissions.includes(n.perm));
  }, [permissions]);

  const roleKey = normalizeStaffRole(user.role);
  const roleLabel = STAFF_ROLE_LABELS[roleKey][locale === 'zh' ? 'zh' : locale === 'en' ? 'en' : 'ko'];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === `/${locale}${href}` : pathname.startsWith(`/${locale}${href}`);

  // 后台语言切换（한국어 / 中文）：替换 URL 首段 locale，整站语言跟随
  function switchLocale(next: Locale) {
    const segments = pathname.split('/');
    segments[1] = next;
    const newPath = segments.join('/') || `/${next}`;
    const qs = typeof window !== 'undefined' && window.location.search ? window.location.search : '';
    router.push(qs ? `${newPath}${qs}` : newPath);
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <aside className="w-60 shrink-0 bg-ink text-bg p-5 hidden md:block sticky top-0 h-screen overflow-y-auto">
        <Link href={`/${locale}`} className="block mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/jnd-logo-white.png" alt="J&D" width={120} height={61} className="h-9 w-auto" />
        </Link>
        <div className="text-[10px] tracking-[0.3em] text-accent mb-8">{t.console}</div>
        <nav className="space-y-1">
          {visibleNav.map((n) => (
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
          {visibleNav.map((n) => (
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
            {user.name || user.username || user.email || t.amDefaultUser}
          </span>
          {/* 当前权限档位（一眼看出自己是哪个角色） */}
          <span
            className="hidden md:inline text-[10px] tracking-widest border border-line px-2 py-1 mr-3 text-muted"
            title={t.roleLabelTip}
          >
            {roleLabel}
          </span>
          {/* 新订单 / 新消息提醒 */}
          <AdminBell locale={locale} />
          <div className="flex items-center border border-line mr-2">
            <button
              onClick={() => switchLocale('ko')}
              aria-current={locale === 'ko'}
              className={`px-2.5 py-1.5 text-xs transition-colors ${
                locale === 'ko' ? 'bg-ink text-bg' : 'text-muted hover:text-ink'
              }`}
            >
              한국어
            </button>
            <button
              onClick={() => switchLocale('zh')}
              aria-current={locale === 'zh'}
              className={`px-2.5 py-1.5 text-xs transition-colors ${
                locale === 'zh' ? 'bg-ink text-bg' : 'text-muted hover:text-ink'
              }`}
            >
              中文
            </button>
          </div>
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
