import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getSession } from '@/lib/auth';
import { AdminShell } from '@/components/admin/admin-shell';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Admin' },
  robots: { index: false, follow: false },
};

export default async function AdminDashboardLayout({
  params,
  children,
}: {
  params: Promise<{ locale: string }>;
  children: React.ReactNode;
}) {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    redirect(`/${loc}/admin/login`);
  }

  return (
    <AdminShell user={{ email: session.email, name: session.name }}>
      {children}
    </AdminShell>
  );
}
