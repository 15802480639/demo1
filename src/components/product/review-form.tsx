'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/i18n/locale-provider';

export function ReviewForm({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productSlug: slug, rating, title, content }),
    });
    setBusy(false);
    if (res.status === 401) {
      router.push(`/${locale}/login?redirect=/${locale}/products/${slug}`);
      return;
    }
    if (res.ok) {
      setDone(true);
      setTitle('');
      setContent('');
      setTimeout(() => router.refresh(), 600);
    } else {
      setErr('submit failed');
    }
  }

  if (done) {
    return (
      <p className="text-sm text-accent border border-accent px-4 py-3">
        {locale === 'ko' ? '리뷰가 등록되었습니다.' : 'Review submitted. Thank you!'}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="border border-line p-5 space-y-3 max-w-xl">
      <div className="flex items-center gap-2">
        <span className="text-xs tracking-widest text-muted">★</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => setRating(n)}
            className={n <= rating ? 'text-accent text-xl' : 'text-line text-xl'}
          >
            ★
          </button>
        ))}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={locale === 'ko' ? '제목' : 'Title'}
        className="w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder={locale === 'ko' ? '후기 내용' : 'Your review'}
        className="w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button type="submit" disabled={busy} className="btn-gold text-sm">
        {busy ? '…' : locale === 'ko' ? '리뷰 등록' : 'Submit Review'}
      </button>
    </form>
  );
}
