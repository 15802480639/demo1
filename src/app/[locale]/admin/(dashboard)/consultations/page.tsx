'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/format';

/**
 * Kakao 咨询记录后台
 *
 * 存在的理由：用户点「Kakao 咨询购买」是纯 <a href> 跳转，Kakao 侧不携带任何商品信息，
 * 客服只会收到"有人来消息"，不知道对方问的是哪个商品、什么规格、多少钱。
 * 本页把这些上下文补齐，并提供一键复制回复模板（粘到 Kakao 直接发）。
 */

type Row = {
  id: string;
  productSlug: string | null;
  productName: string;
  skuLabel: string | null;
  price: number;
  locale: string;
  status: string;
  sourcePage: string | null;
  createdAt: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: '新咨询', cls: 'bg-red-50 text-red-700 border-red-200' },
  contacted: { label: '已联系', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  closed: { label: '已关闭', cls: 'bg-line/20 text-muted border-line' },
};

export default function AdminConsultationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  async function load(status: string) {
    setLoading(true);
    try {
      const r = await fetch(`/api/consultation?status=${encodeURIComponent(status)}&limit=200`);
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setRows(d.rows ?? []);
      const c: Record<string, number> = {};
      for (const g of d.counts ?? []) c[g.status] = g._count._all;
      setCounts(c);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function setStatus(id: string, status: string) {
    // 乐观更新，避免整表重载
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await fetch('/api/consultation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
    } catch {
      load(filter);
    }
  }

  /** 生成可直接粘进 Kakao 的回复模板（韩文，面向韩国客户） */
  function buildTemplate(r: Row): string {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'http://8.217.66.83';
    const link = r.productSlug ? `${base}/ko/products/${r.productSlug}` : base;
    const lines = [
      '안녕하세요, J&D 입니다. 문의해 주신 상품 안내드립니다.',
      '',
      `■ 상품: ${r.productName}`,
    ];
    if (r.skuLabel) lines.push(`■ 옵션: ${r.skuLabel}`);
    lines.push(`■ 가격: ${formatPrice(r.price, 'ko')}`);
    lines.push('', `■ 링크: ${link}`, '', '재고 및 배송 일정을 확인하여 안내드리겠습니다.');
    return lines.join('\n');
  }

  async function copyTemplate(r: Row) {
    const text = buildTemplate(r);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 非安全上下文下 clipboard API 不可用，退回选中提示
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(r.id);
    setTimeout(() => setCopied((c) => (c === r.id ? null : c)), 2000);
    if (r.status === 'new') setStatus(r.id, 'contacted');
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl mb-1">Kakao 咨询记录</h1>
        <p className="text-xs text-muted">
          用户点「Kakao 咨询购买」时本站会自动留档。客服在 Kakao 收到消息后，
          到这里查商品上下文，点「复制回复模板」粘到 Kakao 即可。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { k: 'all', label: `全部 ${total}` },
          { k: 'new', label: `新咨询 ${counts.new ?? 0}` },
          { k: 'contacted', label: `已联系 ${counts.contacted ?? 0}` },
          { k: 'closed', label: `已关闭 ${counts.closed ?? 0}` },
        ].map((b) => (
          <button
            key={b.k}
            onClick={() => setFilter(b.k)}
            className={`px-3 py-1.5 text-xs border transition-colors ${
              filter === b.k ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted">加载中…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">暂无记录。</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {rows.map((r) => {
            const st = STATUS[r.status] ?? STATUS.new;
            return (
              <div key={r.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] px-2 py-0.5 border ${st.cls}`}>{st.label}</span>
                    <span className="text-[11px] text-muted">
                      {new Date(r.createdAt).toLocaleString('zh-CN')}
                    </span>
                    <span className="text-[11px] text-muted">
                      访客语言: {r.locale}
                      {r.sourcePage ? ` · 来源: ${r.sourcePage}` : ''}
                    </span>
                  </div>
                  <p className="text-sm mt-1.5 truncate">{r.productName}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {r.skuLabel ? `${r.skuLabel} · ` : ''}
                    {formatPrice(r.price, 'zh')}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0 flex-wrap">
                  <button onClick={() => copyTemplate(r)} className="btn-gold text-xs px-3 py-2">
                    {copied === r.id ? '✓ 已复制' : '复制回复模板'}
                  </button>
                  {r.status !== 'contacted' && (
                    <button
                      onClick={() => setStatus(r.id, 'contacted')}
                      className="btn-outline text-xs px-3 py-2"
                    >
                      标为已联系
                    </button>
                  )}
                  {r.status !== 'closed' && (
                    <button
                      onClick={() => setStatus(r.id, 'closed')}
                      className="btn-outline text-xs px-3 py-2"
                    >
                      关闭
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted">
        提示：Kakao 咨询链接在「SEO 设置」里以 <code>kakao.consultUrl</code> 配置，
        未配置时前台不显示 Kakao 入口（不会回退到任何默认链接）。
      </p>
    </div>
  );
}