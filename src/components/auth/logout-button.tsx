'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/i18n/locale-provider';
import { useAuth } from '@/components/auth/auth-provider';

export function LogoutButton() {
  const { locale, dict } = useLocale();
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <button
      onClick={() => logout().then(() => router.push(`/${locale}`))}
      className="bg-surface flex items-center justify-center h-24 text-ink-soft hover:text-accent hover:bg-surface-2 transition-colors text-sm tracking-wide"
    >
      {dict.nav.login === '로그인' ? '로그아웃' : 'Logout'}
    </button>
  );
}
