'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { useCart, cartCount } from '@/lib/cart-store';

/**
 * 账户页菜单卡：图标 + 数量徽章 + 退出登录。
 * 订单数由服务端算好传入；购物车走本地 store；收藏实时拉接口。
 */
export function AccountMenu({
  ordersCount,
  points,
  coupons,
}: {
  ordersCount: number;
  points?: number;
  coupons?: number;
}) {
  const { locale, dict } = useLocale();
  const { user, logout } = useAuth();
  const lines = useCart((s) => s.lines);
  const [wishCount, setWishCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch('/api/wishlist')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setWishCount(Array.isArray(d.items) ? d.items.length : 0))
      .catch(() => setWishCount(null));
  }, [user]);

  const items = [
    {
      label: dict.nav.account,
      href: `/${locale}/account`,
      count: null as number | null,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      label: dict.nav.cart,
      href: `/${locale}/cart`,
      count: cartCount(lines),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M6 8h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      label: dict.account.myOrders,
      href: `/${locale}/account/orders`,
      count: ordersCount,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="3" width="14" height="18" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: dict.nav.wishlist,
      href: `/${locale}/wishlist`,
      count: wishCount,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 20s-7-4.5-9-9c-1.3-3 .8-6.5 4-6.5 2 0 3.5 1 5 3 1.5-2 3-3 5-3 3.2 0 5.3 3.5 4 6.5-2 4.5-9 9-9 9z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      ),
    },
    {
      label:
        locale === 'zh'
          ? '我的优惠券'
          : locale === 'en'
            ? 'My coupons'
            : '내 쿠폰',
      href: `/${locale}/account/coupons`,
      count: coupons ?? null,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M12 8v2m0 2v2m0 2v2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="2 3"
          />
        </svg>
      ),
    },
    {
      label:
        locale === 'zh'
          ? '我的积分'
          : locale === 'en'
            ? 'My points'
            : '내 포인트',
      href: `/${locale}/account/points`,
      count: points ?? null,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M12 7v10M9.5 9.5c0-1 1.2-1.5 2.5-1.5s2.5.5 2.5 1.5c0 2-5 1-5 3 0 1 1.2 1.5 2.5 1.5s2.5-.5 2.5-1.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-line border border-line">
        {items.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="bg-surface group flex flex-col items-center justify-center gap-2 h-28 text-ink-soft hover:text-accent hover:bg-surface-2 transition-colors text-sm tracking-wide text-center px-2 relative"
          >
            <span className="relative">
              {m.icon}
              {m.count !== null && m.count > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] flex items-center justify-center">
                  {m.count > 99 ? '99+' : m.count}
                </span>
              )}
            </span>
            <span className="group-hover:underline underline-offset-4">{m.label}</span>
          </Link>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <button
          onClick={() =>
            logout().then(() => {
              useCart.getState().clear();
              window.location.assign(`/${locale}`);
            })
          }
          className="text-xs tracking-widest border border-line px-4 py-2 text-muted hover:text-accent hover:border-accent transition-colors"
        >
          {dict.account.logout}
        </button>
      </div>
    </div>
  );
}
