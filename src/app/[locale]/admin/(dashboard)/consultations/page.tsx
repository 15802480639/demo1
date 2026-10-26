'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
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

/** 状态样式与语言无关，label 在渲染时按当前语言查字典 */
const STATUS_CLS: Record<string, string> = {
  new: 'bg-red-50 text-red-700 border-red-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  closed: 'bg-line/20 text-muted border-line',
};

export default function AdminConsultationsPage() {
  const { locale, dict } = useLocale();
  const t = dict.admin;
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
  const statusLabel = (s: string) =>
    s === 'contacted' ? t.csContacted : s === 'closed' ? t.csClosed : t.csNew;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl mb-1">{t.csTitle}</h1>
        <p className="text-xs text-muted">{t.csIntro}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { k: 'all', label: t.csAll.replace('{n}', String(total)) },
          { k: 'new', label: t.csNewCount.replace('{n}', String(counts.new ?? 0)) },
          { k: 'contacted', label: t.csContactedCount.replace('{n}', String(counts.contacted ?? 0)) },
          { k: 'closed', label: t.csClosedCount.replace('{n}', String(counts.closed ?? 0)) },
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
        <p className="text-sm text-muted">{t.csLoading}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">{t.csEmpty}</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {rows.map((r) => {
            const st = STATUS_CLS[r.status] ?? STATUS_CLS.new;
            return (
              <div key={r.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] px-2 py-0.5 border ${st}`}>{statusLabel(r.status)}</span>
                    <span className="text-[11px] text-muted">
                      {new Date(r.createdAt).toLocaleString(locale === 'ko' ? 'ko-KR' : locale === 'zh' ? 'zh-CN' : 'en-US')}
                    </span>
                    <span className="text-[11px] text-muted">
                      {t.csVisitorLang.replace('{l}', r.locale)}
                      {r.sourcePage ? t.csSource.replace('{s}', r.sourcePage) : ''}
                    </span>
                  </div>
                  <p className="text-sm mt-1.5 truncate">{r.productName}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {r.skuLabel ? `${r.skuLabel} · ` : ''}
                    {formatPrice(r.price, locale)}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0 flex-wrap">
                  <button onClick={() => copyTemplate(r)} className="btn-gold text-xs px-3 py-2">
                    {copied === r.id ? t.csCopyOk : t.csCopy}
                  </button>
                  {r.status !== 'contacted' && (
                    <button
                      onClick={() => setStatus(r.id, 'contacted')}
                      className="btn-outline text-xs px-3 py-2"
                    >
                      {t.csMarkContacted}
                    </button>
                  )}
                  {r.status !== 'closed' && (
                    <button
                      onClick={() => setStatus(r.id, 'closed')}
                      className="btn-outline text-xs px-3 py-2"
                    >
                      {t.csClose}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted">
        <span dangerouslySetInnerHTML={{ __html: t.csTip }} />
      </p>
    </div>
  );
}