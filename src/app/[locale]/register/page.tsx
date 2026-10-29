import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { RegisterForm } from '@/components/auth/register-form';

export default async function RegisterPage({
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
  // ⭐ 回跳：允许 ?redirect=/ko/xxx（必须同语言前缀，防开放重定向）
  //    实时客服的「注册后继续咨询」就是靠这个参数跳回原页面。
  const redirectTo =
    sp.redirect && sp.redirect.startsWith(`/${loc}/`) ? sp.redirect : `/${loc}/account`;

  return (
    <div className="mx-auto max-w-[440px] px-4 py-20">
      <h1 className="font-display text-4xl text-ink mb-2">{dict.nav.register}</h1>
      <p className="text-muted mb-8">{dict.nav.account}</p>
      <RegisterForm redirectTo={redirectTo} />
    </div>
  );
}
