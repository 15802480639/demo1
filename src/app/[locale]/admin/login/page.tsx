import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getSession } from '@/lib/auth';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Admin Login',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);
  const session = await getSession();
  if (session?.role === 'admin') redirect(`/${loc}/admin`);

  return (
    <div className="mx-auto max-w-[440px] px-4 py-20">
      <h1 className="font-display text-4xl text-ink mb-2">Admin</h1>
      <p className="text-muted mb-8">{dict.nav.login}</p>
      <LoginForm redirectTo={`/${loc}/admin`} requireAdmin />
    </div>
  );
}
