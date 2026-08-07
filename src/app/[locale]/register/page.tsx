import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { RegisterForm } from '@/components/auth/register-form';

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);

  return (
    <div className="mx-auto max-w-[440px] px-4 py-20">
      <h1 className="font-display text-4xl text-ink mb-2">{dict.nav.register}</h1>
      <p className="text-muted mb-8">{dict.nav.account}</p>
      <RegisterForm redirectTo={`/${loc}/account`} />
    </div>
  );
}
