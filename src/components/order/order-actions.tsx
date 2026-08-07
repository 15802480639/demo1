'use client';

import { useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';

export function OrderActions({
  orderNo,
  status,
}: {
  orderNo: string;
  status: string;
}) {
  const { locale } = useLocale();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const cancellable = status === 'pending' || status === 'paid';

  async function cancel() {
    if (!confirm(locale === 'ko' ? '주문을 취소하시겠습니까?' : 'Cancel this order?')) {
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`/api/orders/${orderNo}/cancel`, { method: 'POST' });
      if (res.ok) {
        setDone(true);
        location.reload();
      } else {
        const d = await res.json().catch(() => ({}));
        setErr(
          d.error === 'NOT_CANCELLABLE'
            ? locale === 'ko'
              ? '이미 처리된 주문은 취소할 수 없습니다'
              : 'This order can no longer be cancelled'
            : locale === 'ko'
              ? '취소에 실패했습니다'
              : 'Cancel failed',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) return null;
  if (!cancellable) return null;

  return (
    <div className="mt-4">
      <button
        onClick={cancel}
        disabled={busy}
        className="text-sm border border-line px-4 py-2 hover:border-ink transition-colors disabled:opacity-50"
      >
        {busy
          ? '…'
          : locale === 'ko'
            ? '주문 취소'
            : 'Cancel Order'}
      </button>
      {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
    </div>
  );
}
