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
  const { dict } = useLocale();
  const t = dict.account;
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const cancellable = status === 'pending' || status === 'paid';

  async function cancel() {
    if (!confirm(t.cancelConfirm)) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`/api/orders/${orderNo}/cancel`, { method: 'POST' });
      if (res.ok) {
        setDone(true);
        location.reload();
      } else {
        const d = await res.json().catch(() => ({}));
        setErr(d.error === 'NOT_CANCELLABLE' ? t.notCancellable : t.cancelFailed);
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
        {busy ? '…' : t.cancelOrder}
      </button>
      {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
    </div>
  );
}
