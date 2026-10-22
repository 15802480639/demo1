'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';
import { getDictionary } from '@/i18n/dictionaries';
import { formatPrice } from '@/lib/format';

type Customer = {
  id: string;
  username: string | null;
  name: string | null;
  email: string | null;
  createdAt: string;
  orderCount: number;
  spent: number;
};

export default function AdminCustomersPage() {
  const { locale } = useLocale();
  const t = getDictionary('zh').admin;
  const [list, setList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/customers');
    const data = await res.json();
    setList(data.customers ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return list;
    return list.filter(
      (c) =>
        (c.email ?? '').toLowerCase().includes(kw) ||
        (c.username ?? '').toLowerCase().includes(kw) ||
        (c.name ?? '').toLowerCase().includes(kw),
    );
  }, [list, q]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-3xl text-ink">客户管理</h1>
        <p className="text-xs text-muted mt-1">
          搜索客户邮箱或昵称，点「订单管理」查看该客户名下的订单列表和订单详情。
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索：邮箱 / 昵称"
          className="border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent w-64"
        />
        <span className="text-xs text-muted self-center">
          {filtered.length} / {list.length} 位客户
        </span>
      </div>

      {loading ? (
        <p className="text-muted">加载中…</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-surface-2">
              <div className="flex-1 min-w-0">
                <p className="text-ink truncate">
                  {c.name || c.username || c.email || '—'}
                </p>
                <p className="text-xs text-muted">
                  {c.username ? `@${c.username}` : ''}
                  {c.username && c.email ? ' · ' : ''}
                  {c.email || '未留邮箱'} · 注册于{' '}
                  {new Date(c.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
              <span className="text-sm w-24 text-center text-muted">
                {c.orderCount} 单
              </span>
              <span className="font-display text-lg w-32 text-right">
                {formatPrice(c.spent, 'ko')}
              </span>
              <Link
                href={`/${locale}/admin/orders?userId=${c.id}`}
                className="text-xs px-3 py-1.5 border border-line hover:border-accent text-accent whitespace-nowrap"
              >
                订单管理 →
              </Link>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="p-5 text-sm text-muted">
              {list.length === 0 ? '暂无客户。' : '没有符合搜索条件的客户。'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
