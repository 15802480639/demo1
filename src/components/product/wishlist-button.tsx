'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/i18n/locale-provider';

export function WishlistButton({
  slug,
  className = '',
}: {
  slug: string;
  className?: string;
}) {
  const { locale } = useLocale();
  const router = useRouter();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      if (on) {
        await fetch(`/api/wishlist?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });
        setOn(false);
      } else {
        const res = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        });
        if (res.status === 401) {
          router.push(`/${locale}/login?redirect=/${locale}/products/${slug}`);
          return;
        }
        if (res.ok) setOn(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="wishlist"
      className={`${className} transition-colors ${on ? 'text-red-500' : 'text-ink-soft hover:text-red-500'}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'}>
        <path
          d="M12 21s-7-4.35-9.5-8.5C.5 9 2 5 5.5 5 7.5 5 9 6 12 9c3-3 4.5-4 6.5-4C22 5 23.5 9 21.5 12.5 19 16.65 12 21 12 21z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    </button>
  );
}
