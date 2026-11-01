import { PermGate } from '@/components/admin/perm-gate';
import { StaffClient } from './staffclient';
import { isLocale, type Locale } from '@/i18n/config';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  return (
    <PermGate perm="staff.manage" locale={loc}>
      <StaffClient />
    </PermGate>
  );
}
