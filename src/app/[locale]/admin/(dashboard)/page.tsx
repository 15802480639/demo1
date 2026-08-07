import Link from 'next/link';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/format';

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);

  const [productCount, orderCount, customerCount, revenue, recentOrders] =
    await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count({ where: { role: 'customer' } }),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: true },
      }),
    ]);

  const cards = [
    { label: dict.nav.shop, href: `/${loc}/admin/products`, n: productCount },
    { label: dict.nav.cart, href: `/${loc}/admin/orders`, n: orderCount },
    { label: dict.nav.account, href: `/${loc}/admin/customers`, n: customerCount },
    {
      label: dict.common.price,
      href: `/${loc}/admin/orders`,
      n: formatPrice(revenue._sum.total ?? 0, loc),
    },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="border border-line bg-surface p-6 hover:border-accent transition-colors"
          >
            <p className="font-display text-3xl text-ink">{c.n}</p>
            <p className="text-sm text-muted mt-2">{c.label}</p>
          </Link>
        ))}
      </div>

      <h2 className="font-display text-xl text-ink mt-10 mb-4">
        {dict.nav.cart === '장바구니' ? '최근 주문' : 'Recent Orders'}
      </h2>
      <div className="border border-line divide-y divide-line">
        {recentOrders.length === 0 && (
          <p className="p-5 text-sm text-muted">—</p>
        )}
        {recentOrders.map((o) => (
          <Link
            key={o.id}
            href={`/${loc}/admin/orders`}
            className="flex items-center justify-between p-4 hover:bg-surface-2 transition-colors"
          >
            <div>
              <p className="text-sm text-ink">{o.orderNo}</p>
              <p className="text-xs text-muted">
                {o.user?.email ?? '—'} ·{' '}
                {o.createdAt.toLocaleDateString(loc === 'ko' ? 'ko-KR' : loc)}
              </p>
            </div>
            <span className="font-display text-lg">
              {formatPrice(o.total, loc)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
