import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { LoginForm } from '@/components/auth/login-form';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);
  const redirectTo = sp.redirect && sp.redirect.startsWith(`/${loc}`)
    ? sp.redirect
    : `/${loc}/account`;

  return (
    <div className="mx-auto max-w-[440px] px-4 py-20">
      <h1 className="font-display text-4xl text-ink mb-2">{dict.nav.login}</h1>
      <p className="text-muted mb-8">{dict.nav.account}</p>
      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
