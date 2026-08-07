import Link from 'next/link';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);

  const cards = [
    { label: dict.nav.shop, href: `/${loc}/admin/products`, n: '128' },
    { label: dict.nav.cart, href: `/${loc}/admin/orders`, n: '36' },
    { label: dict.nav.account, href: `/${loc}/admin/customers`, n: '942' },
    { label: dict.nav.brands, href: `/${loc}/admin/brands`, n: '16' },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-4xl text-ink">Admin</h1>
        <Link href={`/${loc}`} className="text-sm text-muted hover:text-accent">
          ← {dict.nav.home}
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="border border-line bg-surface p-6 hover:border-accent transition-colors"
          >
            <p className="font-display text-4xl text-ink">{c.n}</p>
            <p className="text-sm text-muted mt-2">{c.label}</p>
          </Link>
        ))}
      </div>
      <p className="mt-10 text-xs text-muted">
        데모 관리자 화면입니다. 인증 및 실제 데이터 연동은 추후 구현 예정입니다.
      </p>
    </div>
  );
}
