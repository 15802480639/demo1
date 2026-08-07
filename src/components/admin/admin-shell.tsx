'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/components/i18n/locale-provider';
import { useAuth } from '@/components/auth/auth-provider';

const NAV = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/coupons', label: 'Coupons' },
  { href: '/admin/customers', label: 'Customers' },
];

export function AdminShell({
  user,
  children,
}: {
  user: { email: string; name: string | null };
  children: React.ReactNode;
}) {
  const { locale } = useLocale();
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === `/${locale}${href}` : pathname.startsWith(`/${locale}${href}`);

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <aside className="w-56 shrink-0 bg-ink text-bg p-5 hidden md:block">
        <div className="font-display text-2xl mb-1">MKGOLF</div>
        <div className="text-[10px] tracking-[0.3em] text-accent mb-8">ADMIN CONSOLE</div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={`/${locale}${n.href}`}
              className={`block rounded px-3 py-2.5 text-sm transition ${
                isActive(n.href, n.exact)
                  ? 'bg-accent text-white'
                  : 'text-bg/70 hover:bg-ink/60 hover:text-bg'
              }`}
            >
              {n.label}
            </Link>
          ))}
          <Link
            href={`/${locale}`}
            className="block rounded px-3 py-2.5 text-sm text-bg/50 hover:text-bg transition mt-4"
          >
            ← {locale === 'ko' ? '스토어로' : 'Back to store'}
          </Link>
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between border-b border-line px-6 py-3 bg-surface">
          <div className="text-sm text-muted md:hidden">
            <span className="text-accent tracking-widest text-xs">ADMIN</span>
          </div>
          <div className="flex-1" />
          <span className="text-sm text-ink-soft mr-4 hidden sm:inline">
            {user.name || user.email}
          </span>
          <button
            onClick={() => logout().then(() => router.push(`/${locale}/admin/login`))}
            className="text-xs tracking-wide px-3 py-1.5 border border-line hover:border-ink transition-colors"
          >
            {locale === 'ko' ? '로그아웃' : 'Logout'}
          </button>
        </div>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
