import { PermGate } from '@/components/admin/perm-gate';
import { ReportsClient } from './reportsclient';
import { isLocale, type Locale } from '@/i18n/config';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  return (
    <PermGate perm="reports.view" locale={loc}>
      <ReportsClient />
    </PermGate>
  );
}
