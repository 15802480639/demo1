'use client';

import { useState } from 'react';

export function PasswordForm({ locale }: { locale: string }) {
  const t = (ko: string, en: string) => (locale === 'ko' ? ko : en);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current, next }),
      });
      const d = await res.json();
      if (!res.ok) {
        const map: Record<string, string> = {
          PASSWORD_TOO_SHORT: t('비밀번호는 6자 이상', 'Password too short'),
          WRONG_CURRENT: t('현재 비밀번호 불일치', 'Wrong current password'),
          NO_PASSWORD: t('설정 불가', 'Cannot change'),
        };
        setErr(map[d.error] || t('변경 실패', 'Failed'));
        return;
      }
      setMsg(t('비밀번호가 변경되었습니다', 'Password updated'));
      setCurrent('');
      setNext('');
    } finally {
      setLoading(false);
    }
  }

  const input = 'w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent';

  return (
    <section className="border border-line p-6">
      <h2 className="font-display text-2xl text-ink mb-4">{t('비밀번호 변경', 'Change Password')}</h2>
      <form onSubmit={submit} className="space-y-3 max-w-sm">
        <div>
          <label className="text-xs tracking-widest text-muted block mb-1">{t('현재 비밀번호', 'Current')}</label>
          <input type="password" className={input} value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs tracking-widest text-muted block mb-1">{t('새 비밀번호', 'New (6+)')}</label>
          <input type="password" className={input} value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        {msg && <p className="text-sm text-accent">{msg}</p>}
        <button type="submit" disabled={loading} className="btn-gold">
          {loading ? '…' : t('변경', 'Update')}
        </button>
      </form>
    </section>
  );
}
