'use client';

import { useLocale } from '@/components/i18n/locale-provider';

export function AnnouncementBar() {
  const { dict } = useLocale();
  return (
    <div className="bg-ink text-accent-pale text-center text-[11px] sm:text-xs tracking-luxe py-2 px-4">
      <span className="opacity-90">{dict.home.announcement}</span>
    </div>
  );
}
