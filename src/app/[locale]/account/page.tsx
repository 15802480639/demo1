import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getSession } from '@/lib/auth';
import { getOrdersByUser } from '@/lib/services/order-service';
import { AccountMenu } from '@/components/account/account-menu';
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

  const orders = await getOrdersByUser(session.id);

  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-8 py-12">
      <h1 className="font-display text-4xl sm:text-6xl text-ink mb-2">
        {dict.nav.account}
      </h1>
      <p className="text-muted mb-6">
        {session.name ? `${session.name} · ` : ''}
        {session.email ?? session.username ?? ''}
      </p>
      {session.role === 'admin' && (
        <Link
          href={`/${loc}/admin`}
          className="inline-block text-xs tracking-widest text-accent border border-accent px-3 py-1 mb-6 hover:bg-accent hover:text-white transition-colors"
        >
          {dict.account.adminDashboard}
        </Link>
      )}

      <AccountMenu ordersCount={orders.length} />

      <div className="mt-10 space-y-6">
        <AddressManager />
        <PasswordForm locale={loc} />
      </div>
    </div>
  );
}
