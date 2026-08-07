'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/components/i18n/locale-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { useCart, cartCount } from '@/lib/cart-store';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { siteConfig } from '@/lib/site';

export function SiteHeader() {
  const { locale, dict } = useLocale();
  const { user, logout } = useAuth();
  const lines = useCart((s) => s.lines);
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const count = cartCount(lines);

  const nav = [
    { label: dict.nav.shop, href: `/${locale}/products` },
    { label: dict.nav.women, href: `/${locale}/products?gender=women` },
    { label: dict.nav.men, href: `/${locale}/products?gender=men` },
    { label: dict.nav.accessories, href: `/${locale}/products?cat=acc` },
    { label: dict.nav.brands, href: `/${locale}/brands` },
    { label: dict.nav.sale, href: `/${locale}/products?sale=1` },
    { label: dict.nav.events, href: `/${locale}/events` },
  ];

  function switchLocale(next: Locale) {
    setLangOpen(false);
    const segments = pathname.split('/');
    // segments[0] = '' , segments[1] = current locale
    segments[1] = next;
    router.push(segments.join('/') || `/${next}`);
  }

  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur border-b border-line">
      {/* top row */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 flex items-center justify-between h-16 sm:h-20">
        {/* left: mobile menu toggle */}
        <button
          className="lg:hidden p-2 -ml-2"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="menu"
        >
          <span className="block w-6 h-px bg-ink mb-1.5" />
          <span className="block w-6 h-px bg-ink mb-1.5" />
          <span className="block w-6 h-px bg-ink" />
        </button>

        {/* center/left: logo */}
        <Link
          href={`/${locale}`}
          className="font-display text-3xl sm:text-4xl text-ink leading-none select-none"
        >
          {siteConfig.name}
        </Link>

        {/* center: nav (desktop) */}
        <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm tracking-wide text-ink-soft hover:text-ink transition-colors relative group"
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-accent transition-all group-hover:w-full" />
            </Link>
          ))}
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
              {user.role === 'admin' && (
                <Link
                  href={`/${locale}/admin`}
                  className="hidden sm:flex items-center px-2 text-xs tracking-wide text-accent hover:underline"
                >
                  ADMIN
                </Link>
              )}
              <Link
                href={`/${locale}/account`}
                aria-label={dict.nav.account}
                className="p-2 hover:text-accent transition-colors hidden sm:block"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M4 21c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </Link>
              <button
                onClick={() => logout().then(() => router.refresh())}
                className="hidden sm:block text-xs tracking-wide px-2 py-1.5 text-muted hover:text-accent transition-colors"
              >
                {dict.nav.login === '로그인' ? '로그아웃' : 'Logout'}
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
            {nav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-ink-soft border-b border-line last:border-0"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
