import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getSession } from '@/lib/auth';
import { LogoutButton } from '@/components/auth/logout-button';
import { AddressManager } from '@/components/account/address-manager';
import { PasswordForm } from '@/components/account/password-form';

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);
  const session = await getSession();
  if (!session) redirect(`/${loc}/login?redirect=/${loc}/account`);

  const menu = [
    { label: dict.nav.account, href: `/${loc}/account` },
    { label: dict.nav.cart, href: `/${loc}/cart` },
    {
      label: dict.nav.account === '마이페이지' ? '주문 내역' : 'Orders',
      href: `/${loc}/account/orders`,
    },
    { label: dict.nav.wishlist, href: `/${loc}/wishlist` },
  ];

  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-8 py-12">
      <h1 className="font-display text-4xl sm:text-6xl text-ink mb-2">
        {dict.nav.account}
      </h1>
      <p className="text-muted mb-2">
        {session.name ? `${session.name} · ` : ''}
        {session.email}
      </p>
      {session.role === 'admin' && (
        <Link
          href={`/${loc}/admin`}
          className="inline-block text-xs tracking-widest text-accent border border-accent px-3 py-1 mt-2 hover:bg-accent hover:text-white transition-colors"
        >
          ADMIN DASHBOARD
        </Link>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line border border-line mt-8">
        {menu.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="bg-surface flex items-center justify-center h-24 text-ink-soft hover:text-accent hover:bg-surface-2 transition-colors text-sm tracking-wide text-center px-2"
          >
            {m.label}
          </Link>
        ))}
        <LogoutButton />
      </div>
      <div className="mt-10 space-y-6">
        <AddressManager locale={loc} />
        <PasswordForm locale={loc} />
      </div>
    </div>
  );
}
