'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';

type Txn = {
  id: string;
  amount: number;
  type: string;
  remark: string | null;
  balanceAfter: number;
  createdAt: string;
  orderNo: string | null;
};

type EarnWay = { key: string; title: string; desc: string };

type Data = {
  points: number;
  rule: {
    enabled: boolean;
    earnPercent: number;
    minSpendForUse: number;
    pointsPerKrw: number;
    maxUsePercent: number;
  };
  transactions: Txn[];
  earnWays: EarnWay[];
};

/** 流水类型的展示文案与颜色 */
function txnMeta(type: string, locale: string): { label: string; cls: string } {
  const zh = locale === 'zh';
  const en = locale === 'en';
  switch (type) {
    case 'earn':
      return {
        label: zh ? '消费返积分' : en ? 'Earned' : '구매 적립',
        cls: 'text-emerald-600',
      };
    case 'use':
      return {
        label: zh ? '下单抵扣' : en ? 'Redeemed' : '주문 사용',
        cls: 'text-accent',
      };
    case 'refund_deduct':
      return {
        label: zh ? '退款扣回' : en ? 'Refunded' : '환불 회수',
        cls: 'text-red-600',
      };
    case 'admin_add':
      return {
        label: zh ? '客服增加' : en ? 'Added by support' : '客服 지급',
        cls: 'text-emerald-600',
      };
    case 'admin_minus':
      return {
        label: zh ? '客服扣减' : en ? 'Deducted by support' : '客服 차감',
        cls: 'text-red-600',
      };
    default:
      return { label: type, cls: 'text-muted' };
  }
}

export default function AccountPointsPage() {
  const { locale } = useLocale();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/account/points')
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-[900px] px-4 sm:px-8 py-12">
        <p className="text-muted">加载中…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[900px] px-4 sm:px-8 py-12">
        <h1 className="font-display text-4xl text-ink mb-4">
          {locale === 'zh' ? '我的积分' : locale === 'en' ? 'My Points' : '내 포인트'}
        </h1>
        <p className="text-muted">
          {locale === 'zh'
            ? '积分数据加载失败，请刷新重试。'
            : locale === 'en'
              ? 'Failed to load points. Please refresh.'
              : '포인트를 불러오지 못했습니다. 새로고침해 주세요.'}
        </p>
      </div>
    );
  }

  const onePointValue = data.rule.pointsPerKrw > 0 ? 1 / data.rule.pointsPerKrw : 0;

  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-8 py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl text-ink mb-1">
            {locale === 'zh' ? '我的积分' : locale === 'en' ? 'My Points' : '내 포인트'}
          </h1>
          <p className="text-sm text-muted">
            {locale === 'zh'
              ? '积分可用于下单抵扣，抵扣后直接减少应付金额。'
              : locale === 'en'
                ? 'Points can be used at checkout to reduce your payment.'
                : '포인트는 주문 시 결제 금액을 줄이는 데 사용할 수 있습니다.'}
          </p>
        </div>
        <Link
          href={`/${locale}/account`}
          className="text-xs tracking-widest text-accent border border-accent px-3 py-1.5 hover:bg-accent hover:text-white transition-colors"
        >
          {locale === 'zh' ? '← 返回账户' : locale === 'en' ? '← Account' : '← 계정으로'}
        </Link>
      </div>

      {/* 余额卡 */}
      <div className="border border-line bg-surface p-6 mb-8">
        <p className="text-xs tracking-widest text-muted mb-2">
          {locale === 'zh' ? '当前可用积分' : locale === 'en' ? 'Available points' : '사용 가능 포인트'}
        </p>
        <p className="font-display text-5xl text-accent">
          {data.points.toLocaleString()}
          <span className="text-lg text-muted ml-2">
            {locale === 'zh' ? '分' : locale === 'en' ? 'pts' : 'P'}
          </span>
        </p>
        {data.rule.enabled && (
          <p className="text-xs text-muted mt-3">
            {locale === 'zh'
              ? `约可抵扣 ${Math.floor(data.points * onePointValue).toLocaleString()}₩（${data.rule.pointsPerKrw.toLocaleString()} 积分 = 1₩）`
              : locale === 'en'
                ? `Worth about ₩${Math.floor(data.points * onePointValue).toLocaleString()} (${data.rule.pointsPerKrw} pts = ₩1)`
                : `약 ₩${Math.floor(data.points * onePointValue).toLocaleString()} 사용 가능 (${data.rule.pointsPerKrw}P = ₩1)`}
          </p>
        )}
      </div>

      {/* 获得途径 */}
      <div className="mb-10">
        <h2 className="font-display text-2xl text-ink mb-4">
          {locale === 'zh' ? '积分怎么获得' : locale === 'en' ? 'How to earn points' : '적립 방법'}
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {data.earnWays.map((w) => (
            <div key={w.key} className="border border-line p-5">
              <p className="text-ink font-medium mb-2">{w.title}</p>
              <p className="text-xs text-muted leading-relaxed">{w.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 流水 */}
      <div>
        <h2 className="font-display text-2xl text-ink mb-4">
          {locale === 'zh' ? '积分明细' : locale === 'en' ? 'Point history' : '적립 내역'}
        </h2>
        {data.transactions.length === 0 ? (
          <p className="text-sm text-muted">
            {locale === 'zh'
              ? '还没有积分记录。'
              : locale === 'en'
                ? 'No point activity yet.'
                : '아직 적립 내역이 없습니다.'}
          </p>
        ) : (
          <div className="border border-line divide-y divide-line">
            {data.transactions.map((t) => {
              const meta = txnMeta(t.type, locale);
              const positive = t.amount > 0;
              return (
                <div key={t.id} className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${meta.cls}`}>{meta.label}</p>
                    {t.remark && <p className="text-xs text-muted mt-0.5">{t.remark}</p>}
                    <p className="text-[11px] text-muted mt-0.5">
                      {new Date(t.createdAt).toLocaleString('zh-CN')}
                      {t.orderNo && ` · ${t.orderNo}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-display text-lg ${positive ? 'text-accent' : 'text-red-600'}`}
                    >
                      {positive ? '+' : ''}
                      {t.amount.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-muted">
                      {locale === 'zh' ? '余额' : locale === 'en' ? 'Balance' : '잔액'}{' '}
                      {t.balanceAfter.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
