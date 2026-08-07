import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/format';

export default async function AdminCustomersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);

  const customers = await prisma.user.findMany({
    where: { role: 'customer' },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { orders: true } },
      orders: { select: { total: true } },
    },
  });

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-6">Customers</h1>
      <div className="border border-line divide-y divide-line">
        {customers.length === 0 && (
          <p className="p-5 text-sm text-muted">No customers yet</p>
        )}
        {customers.map((c) => {
          const spend = c.orders.reduce((s, o) => s + o.total, 0);
          return (
            <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-surface-2">
              <div className="flex-1 min-w-0">
                <p className="text-ink truncate">{c.name || c.email}</p>
                <p className="text-xs text-muted">{c.email}</p>
              </div>
              <span className="text-sm w-24 text-center text-muted">
                {c._count.orders} {dict.nav.cart === '장바구니' ? '건' : 'orders'}
              </span>
              <span className="font-display text-lg w-32 text-right">
                {formatPrice(spend, loc)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
