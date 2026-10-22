'use client';

import { useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';

export function Subscribe() {
  const { dict, locale } = useLocale();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return;
    setSaving(true);
    setErr('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        setErr(dict.home.subscribeFailed);
      }
    } catch {
      setErr(dict.home.subscribeFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-ink text-white">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-20 text-center">
        <h2 className="font-display text-3xl sm:text-5xl">
          {dict.home.subscribeTitle}
        </h2>
        <p className="mt-4 text-white/70 max-w-md mx-auto">
          {dict.home.subscribeSub}
        </p>
        {done ? (
          <p className="mt-8 text-accent tracking-widest text-sm">
            ✦ {dict.common.subscribe}
          </p>
        ) : (
          <form
            onSubmit={submit}
            className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={dict.common.emailPlaceholder}
              className="flex-1 bg-transparent border border-white/30 px-4 py-3 text-sm outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              disabled={saving}
              className="btn-gold disabled:opacity-60"
              style={{ background: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}
            >
              {saving ? '…' : dict.common.subscribe}
            </button>
          </form>
        )}
        {err && <p className="mt-3 text-xs text-red-300">{err}</p>}
      </div>
    </section>
  );
}
