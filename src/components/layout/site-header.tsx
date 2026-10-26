'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/components/i18n/locale-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { useCart, cartCount } from '@/lib/cart-store';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { siteConfig } from '@/lib/site';

type NavCategory = {
  id: string;
  slug: string;
  name: string;
  nameZh: string | null;
  parentId: string | null;
  depth: number;
  childSlugs: string[];
};

export function SiteHeader() {
  const { locale, dict } = useLocale();
  const { user, logout } = useAuth();
  const lines = useCart((s) => s.lines);
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  // 移动端菜单：当前展开的一级分类 href（null = 都收起）
  const [openCat, setOpenCat] = useState<string | null>(null);
  // 桌面端：点击一级分类展开/收起下拉面板（有子分类时点击不跳转）
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [navCategories, setNavCategories] = useState<NavCategory[]>([]);
  const count = cartCount(lines);

  // 后台「分类管理」里添加的分类自动出现在导航栏（全部商品之后）
  useEffect(() => {
    let alive = true;
    fetch('/api/site-content')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.categories) setNavCategories(d.categories);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 分类导航：一级分类进 nav，二级/三级分类全部收进其下拉面板
  const topCategories = navCategories.filter((c) => c.depth === 1);

  // 路由变化 / 点击导航以外区域时，收起桌面下拉面板
  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);
  useEffect(() => {
    if (!openMenu) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || !t.closest('[data-cat-menu]')) setOpenMenu(null);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [openMenu]);

  // ⚠️ 只按 parentId 过滤、不写死 depth：数据层 depth 由树计算，
  // 万一某级断档，写死 depth 会静默丢子分类
  const subsOf = (parentId: string) =>
    navCategories.filter((c) => c.parentId === parentId);
  const labelOf = (c: NavCategory) =>
    locale === 'zh' ? c.nameZh || c.name : c.name;
  const catHref = (chain: NavCategory[]) =>
    `/${locale}/c/${chain.map((c) => encodeURIComponent(c.slug)).join('/')}`;

  const nav = [
    { label: dict.nav.shop, href: `/${locale}/products` },
    ...topCategories.map((c) => ({
      label: labelOf(c),
      href: catHref([c]),
      children: subsOf(c.id).map((s) => ({
        label: labelOf(s),
        href: catHref([c, s]),
        children: subsOf(s.id).map((t) => ({
          label: labelOf(t),
          href: catHref([c, s, t]),
        })),
      })),
    })),
    { label: dict.nav.women, href: `/${locale}/products?gender=women` },
    { label: dict.nav.men, href: `/${locale}/products?gender=men` },
    { label: dict.nav.brands, href: `/${locale}/brands` },
    { label: dict.nav.sale, href: `/${locale}/products?sale=1` },
    { label: dict.nav.events, href: `/${locale}/events` },
  ];

  function switchLocale(next: Locale) {
    setLangOpen(false);
    const segments = pathname.split('/');
    // segments[0] = '' , segments[1] = current locale
    segments[1] = next;
    const newPath = segments.join('/') || `/${next}`;
    // preserve query string (e.g. ?gender=women) across language switch
    const qs =
      typeof window !== 'undefined' && window.location.search
        ? window.location.search
        : '';
    router.push(qs ? `${newPath}${qs}` : newPath);
  }

  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur border-b border-line">
      {/* top row */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 flex items-center justify-between h-16 sm:h-20">
        {/* left: mobile menu toggle */}
        <button
          className="lg:hidden p-2 -ml-2"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={dict.common.menu}
        >
          <span className="block w-6 h-px bg-ink mb-1.5" />
          <span className="block w-6 h-px bg-ink mb-1.5" />
          <span className="block w-6 h-px bg-ink" />
        </button>

        {/* center/left: logo */}
        <Link
          href={`/${locale}`}
          className="flex items-center select-none"
          aria-label={siteConfig.nameKo}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={siteConfig.logo}
            alt={siteConfig.nameKo}
            width={120}
            height={61}
            className="h-8 sm:h-10 w-auto"
          />
        </Link>

        {/* center: nav (desktop) —— ⚠️ 禁止加 overflow-x-auto：会裁剪下拉面板 */}
        <nav className="hidden lg:flex flex-1 min-w-0 items-center justify-center">
          <div className="flex items-center gap-5 whitespace-nowrap px-2">
          {nav.map((item) => {
            const isActive = pathname === item.href.split('?')[0];
            const children = 'children' in item ? item.children : undefined;
            const hasChildren = !!children && children.length > 0;
            const isOpen = openMenu === item.href;
            return (
              <div
                key={item.label}
                data-cat-menu
                className={`relative text-sm tracking-wide transition-colors ${
                  isActive ? 'text-ink' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  aria-expanded={hasChildren ? isOpen : undefined}
                  className="block"
                  onClick={
                    hasChildren
                      ? (e) => {
                          // 有下级分类：点击 = 展开/收起下拉，不跳转
                          e.preventDefault();
                          setOpenMenu((v) => (v === item.href ? null : item.href));
                        }
                      : undefined
                  }
                >
                  {item.label}
                  {hasChildren && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      className={`inline-block ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden
                    >
                      <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  )}
                  <span
                    className={`absolute -bottom-1 left-0 h-px bg-accent transition-all duration-300 ${
                      isActive ? 'w-full' : 'w-0 hover:w-full'
                    }`}
                  />
                </Link>
                {/* 二级/三级分类下拉：点击展开，三级缩进列在二级下方；面板顶部可进入该分类页 */}
                {hasChildren && isOpen && (
                  <div className="absolute left-0 top-full z-50 pt-2" role="menu">
                    <div className="bg-surface border border-line shadow-card py-2 min-w-[220px] max-h-[70vh] overflow-y-auto">
                      <Link
                        href={item.href}
                        role="menuitem"
                        onClick={() => setOpenMenu(null)}
                        className="block px-4 py-2 text-xs text-accent border-b border-line mb-1 whitespace-nowrap"
                      >
                        {dict.nav.shop} · {item.label}
                      </Link>
                      {children!.map((c) => (
                        <div key={c.href}>
                          <Link
                            href={c.href}
                            role="menuitem"
                            onClick={() => setOpenMenu(null)}
                            className="block px-4 py-2 text-sm text-ink hover:text-accent hover:bg-surface-2 transition-colors whitespace-nowrap"
                          >
                            {c.label}
                          </Link>
                          {'children' in c && c.children && c.children.length > 0 && (
                            <div className="ml-4 my-1 border-l border-line">
                              {c.children.map((t) => (
                                <Link
                                  key={t.href}
                                  href={t.href}
                                  role="menuitem"
                                  onClick={() => setOpenMenu(null)}
                                  className="block px-4 py-1.5 text-xs text-muted hover:text-accent transition-colors whitespace-nowrap"
                                >
                                  {t.label}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </nav>

        {/* right: actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* language switcher */}
          <div className="relative">
            <button
              className="flex items-center gap-1 text-xs tracking-wide px-2 py-1.5 hover:text-accent transition-colors"
              onClick={() => setLangOpen((v) => !v)}
            >
              {locale.toUpperCase()}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-surface border border-line shadow-soft py-1 z-50">
                {locales.map((l) => (
                  <button
                    key={l}
                    onClick={() => switchLocale(l)}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-surface-2 ${
                      l === locale ? 'text-accent' : 'text-ink-soft'
                    }`}
                  >
                    {localeNames[l]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            href={`/${locale}/search`}
            aria-label={dict.common.search}
            className="p-2 hover:text-accent transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </Link>

          {user ? (
            <>
              <Link
                href={`/${locale}/account`}
                aria-label={dict.nav.account}                className="p-2 hover:text-accent transition-colors hidden sm:block"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M4 21c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </Link>
              <button
                onClick={() =>
                  logout().then(() => {
                    // 🔴 硬导航：强制 SSR 重读 session，防止缓存 layout 仍显示旧登录态
                    window.location.assign(`/${locale}`);
                  })
                }
                className="hidden sm:block text-xs tracking-wide px-2 py-1.5 text-muted hover:text-accent transition-colors"
              >
                {dict.account.logout}
              </button>
            </>
          ) : (
            <>
              <Link
                href={`/${locale}/register`}
                className="hidden sm:block text-xs tracking-wide px-3 py-1.5 border border-line hover:border-accent transition-colors"
              >
                {dict.nav.register}
              </Link>
              <Link
                href={`/${locale}/login`}
                className="text-xs tracking-wide px-2 py-1.5 text-muted hover:text-accent transition-colors"
              >
                {dict.nav.login}
              </Link>
            </>
          )}

          <Link
            href={`/${locale}/cart`}
            aria-label={dict.nav.cart}
            className="p-2 hover:text-accent transition-colors relative"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 8h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* mobile dropdown nav */}
      {menuOpen && (
        <nav className="lg:hidden border-t border-line bg-surface">
          <div className="px-4 py-3 flex flex-col">
            {nav.map((item) => {
              const children = 'children' in item ? item.children : undefined;
              const hasChildren = !!children && children.length > 0;
              const expanded = openCat === item.href;
              return (
                <div key={item.href} className="border-b border-line last:border-0">
                  {hasChildren ? (
                    <>
                      {/* 有子分类：点击展开/收起，不直接跳转 */}
                      <button
                        onClick={() => setOpenCat(expanded ? null : item.href)}
                        className="w-full flex items-center justify-between py-3 text-ink-soft"
                        aria-expanded={expanded}
                      >
                        {item.label}
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                        >
                          <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" />
                        </svg>
                      </button>
                      {expanded && (
                        <div className="pb-2">
                          <Link
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className="block py-2 text-sm text-accent"
                          >
                            {dict.nav.shop} · {item.label}
                          </Link>
                          {children!.map((c) => (
                            <div key={c.href} className="border-l border-line ml-1 pl-3">
                              <Link
                                href={c.href}
                                onClick={() => setMenuOpen(false)}
                                className="block py-2 text-sm text-ink-soft hover:text-accent transition-colors"
                              >
                                {c.label}
                              </Link>
                              {'children' in c && c.children && c.children.length > 0 && (
                                <div className="ml-2 border-l border-line pl-3">
                                  {c.children.map((t) => (
                                    <Link
                                      key={t.href}
                                      href={t.href}
                                      onClick={() => setMenuOpen(false)}
                                      className="block py-1.5 text-xs text-muted hover:text-accent transition-colors"
                                    >
                                      {t.label}
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="block py-3 text-ink-soft"
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
