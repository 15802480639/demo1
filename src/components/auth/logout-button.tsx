'use client';

import { useLocale } from '@/components/i18n/locale-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { useCart } from '@/lib/cart-store';

export function LogoutButton() {
  const { locale, dict } = useLocale();
  const { logout } = useAuth();
  const clear = useCart((s) => s.clear);

  return (
    <button
      onClick={() =>
        logout().then(() => {
          // 登出即清空本地购物车缓存（属于上一账号的浏览痕迹）
          clear();
          // 🔴 硬导航：强制 SSR 重读 session，避免缓存 layout 仍显示登录态
          window.location.assign(`/${locale}`);
        })
      }
      className="bg-surface flex items-center justify-center h-24 text-ink-soft hover:text-accent hover:bg-surface-2 transition-colors text-sm tracking-wide"
    >
      {dict.account.logout}
    </button>
  );
}
