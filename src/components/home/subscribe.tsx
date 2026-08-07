'use client';

import { useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';

export function Subscribe() {
  const { dict } = useLocale();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

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
            onSubmit={(e) => {
              e.preventDefault();
              if (email.includes('@')) setDone(true);
            }}
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
            <button type="submit" className="btn-gold" style={{ background: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}>
              {dict.common.subscribe}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
