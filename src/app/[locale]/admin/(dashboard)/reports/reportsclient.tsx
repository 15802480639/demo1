'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import { formatPrice } from '@/lib/format';

type Row = {
  date: string;
  orders: number;
  items: number;
  revenue: number;
  aov: number;
  newCustomers: number;
};

type Summary = {
  revenue: number;
  orders: number;
  items: number;
  aov: number;
  newCustomers: number;
};

const RANGES = [
  { key: '7d', ko: '최근 7일', zh: '最近 7 天', en: 'Last 7 days' },
  { key: '30d', ko: '최근 30일', zh: '最近 30 天', en: 'Last 30 days' },
  { key: '90d', ko: '최근 90일', zh: '最近 90 天', en: 'Last 90 days' },
  { key: 'all', ko: '전체', zh: '全部', en: 'All' },
];

export function ReportsClient() {
  const { locale, dict } = useLocale();
  const t = dict.admin;
  const [range, setRange] = useState('30d');
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');

  async function load(r = range) {
    setLoading(true);
    const res = await fetch(`/api/admin/reports/sales?range=${r}`);
    if (res.status === 403) {
      setLoading(false);
      return;
    }
    const d = await res.json();
    setRows(d.rows ?? []);
    setSummary(d.summary ?? null);
    setLoading(false);
  }
  useEffect(() => {
    load(range);
  }, [range]);

  function download(type: 'orders' | 'customers' | 'sales') {
    setExporting(type);
    const url = `/api/admin/export?type=${type}&range=${range}`;
    // 用隐藏 a 触发下载，避免新窗口被拦截
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => setExporting(''), 1500);
  }

  const select =
    'border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent';
  const btn =
    'text-xs px-3 py-1.5 border border-line hover:border-accent text-accent disabled:opacity-50';

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-3xl text-ink">{t.repTitle}</h1>
        <p className="text-xs text-muted mt-1">{t.repIntro}</p>
      </div>

      {/* 时间范围 + 导出 */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select className={select} value={range} onChange={(e) => setRange(e.target.value)}>
          {RANGES.map((r) => (
            <option key={r.key} value={r.key}>
              {locale === 'zh' ? r.zh : locale === 'en' ? r.en : r.ko}
            </option>
          ))}
        </select>
        <div className="flex gap-2 ml-auto">
          <button className={btn} onClick={() => download('orders')} disabled={!!exporting}>
            {exporting === 'orders' ? t.expWorking : t.expOrders}
          </button>
          <button className={btn} onClick={() => download('customers')} disabled={!!exporting}>
            {exporting === 'customers' ? t.expWorking : t.expCustomers}
          </button>
          <button className={btn} onClick={() => download('sales')} disabled={!!exporting}>
            {exporting === 'sales' ? t.expWorking : t.expSales}
          </button>
        </div>
      </div>

      {/* 汇总卡 */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card label={t.repTotalRevenue} value={formatPrice(summary.revenue, 'ko')} accent />
          <Card label={t.repTotalOrders} value={String(summary.orders)} />
          <Card label={t.repTotalItems} value={String(summary.items)} />
          <Card label={t.repAvgOrder} value={formatPrice(summary.aov, 'ko')} />
          <Card label={t.repNewCustomers} value={String(summary.newCustomers)} />
        </div>
      )}

      {loading ? (
        <p className="text-muted text-sm">{t.oLoading}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted border border-line p-5">{t.repEmpty}</p>
      ) : (
        <div className="border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-left border-b border-line">
                <th className="px-3 py-2 font-normal">{t.repDate}</th>
                <th className="px-3 py-2 font-normal">{t.repOrders}</th>
                <th className="px-3 py-2 font-normal">{t.repItems}</th>
                <th className="px-3 py-2 font-normal">{t.repRevenue}</th>
                <th className="px-3 py-2 font-normal">{t.repAov}</th>
                <th className="px-3 py-2 font-normal">{t.repNewCustomers}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date} className="border-b border-line last:border-0 hover:bg-surface-2">
                  <td className="px-3 py-2 text-xs">{r.date}</td>
                  <td className="px-3 py-2 text-xs">{r.orders}</td>
                  <td className="px-3 py-2 text-xs">{r.items}</td>
                  <td className="px-3 py-2 text-xs">{formatPrice(r.revenue, 'ko')}</td>
                  <td className="px-3 py-2 text-xs">{formatPrice(r.aov, 'ko')}</td>
                  <td className="px-3 py-2 text-xs">{r.newCustomers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Card({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border border-line p-3">
      <p className="text-[10px] tracking-widest text-muted">{label}</p>
      <p
        className={`font-display text-lg mt-1 ${accent ? 'text-accent' : 'text-ink'}`}
      >
        {value}
      </p>
    </div>
  );
}
