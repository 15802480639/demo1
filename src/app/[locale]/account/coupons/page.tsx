'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  minSpend: number;
  status: string;
  expiresAt: string | null;
  usedOrderNo: string | null;
};

export default function AccountCouponsPage() {
  const { locale } = useLocale();
  const [list, setList] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/account/coupons')
      .then((r) => r.json())
      .then((d) => {
        setList(d.coupons ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const t = {
    zh: {
      title: '我的优惠券',
      desc: '这里是你账户里的优惠券，结算时输入券码即可使用。',
      value: '优惠',
      minSpend: '满',
      available: '可使用',
      used: '已使用',
      expired: '已过期',
      pending: '未生效',
      code: '券码',
      empty: '你还没有优惠券。',
      back: '← 返回账户',
    },
    en: {
      title: 'My coupons',
      desc: 'Coupons in your account. Enter the code at checkout to use them.',
      value: 'Value',
      minSpend: 'Min spend',
      available: 'Available',
      used: 'Used',
      expired: 'Expired',
      pending: 'Not started',
      code: 'Code',
      empty: 'You have no coupons yet.',
      back: '← Account',
    },
    ko: {
      title: '내 쿠폰',
      desc: '계정에 있는 쿠폰입니다. 결제 시 쿠폰 코드를 입력해 사용하세요.',
      value: '할인',
      minSpend: '최소',
      available: '사용 가능',
      used: '사용 완료',
      expired: '만료됨',
      pending: '시작 전',
      code: '쿠폰 코드',
      empty: '쿠폰이 없습니다.',
      back: '← 계정으로',
    },
  }[locale];

  const statusLabel = (s: string) =>
    s === 'used' ? t.used : s === 'expired' ? t.expired : s === 'pending' ? t.pending : t.available;
  const statusCls = (s: string) =>
    s === 'available'
      ? 'border-emerald-300 text-emerald-700'
      : s === 'used'
        ? 'border-line text-muted'
        : 'border-line text-muted/60';

  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-8 py-12">
      <div className="flex items-end justify-between mb-2">
        <h1 className="font-display text-4xl sm:text-5xl text-ink">{t.title}</h1>
        <Link
          href={`/${locale}/account`}
          className="text-xs tracking-widest text-accent border border-accent px-3 py-1.5 hover:bg-accent hover:text-white transition-colors"
        >
          {t.back}
        </Link>
      </div>
      <p className="text-sm text-muted mb-8">{t.desc}</p>

      {loading ? (
        <p className="text-muted">加载中…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted border border-line p-6">{t.empty}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {list.map((c) => {
            const usable = c.status === 'available';
            return (
              <div
                key={c.id}
                className={`border p-5 relative ${usable ? 'border-accent/50 bg-accent/5' : 'border-line opacity-70'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-display text-2xl text-ink">
                      {c.type === 'percent' ? `${c.value}%` : `₩${c.value.toLocaleString()}`}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {t.value}
                      {c.minSpend > 0 && ` · ${t.minSpend} ₩${c.minSpend.toLocaleString()}`}
                    </p>
                  </div>
                  <span className={`text-[10px] border px-2 py-1 ${statusCls(c.status)}`}>
                    {statusLabel(c.status)}
                  </span>
                </div>
                <div className="border-t border-dashed border-line pt-3">
                  <p className="text-xs text-muted">
                    {t.code}：<span className="text-ink font-medium tracking-wider">{c.code}</span>
                  </p>
                  {c.expiresAt && (
                    <p className="text-[11px] text-muted mt-1">
                      {locale === 'zh' ? '有效期至' : locale === 'en' ? 'Valid until' : '사용 기한'}{' '}
                      {new Date(c.expiresAt).toLocaleDateString('zh-CN')}
                    </p>
                  )}
                  {c.usedOrderNo && (
                    <p className="text-[11px] text-muted mt-1">
                      {locale === 'zh' ? '用于订单' : locale === 'en' ? 'Used on' : '사용 주문'}{' '}
                      {c.usedOrderNo}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
