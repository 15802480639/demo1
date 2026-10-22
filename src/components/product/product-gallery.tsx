'use client';

import { useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const { dict } = useLocale();
  const shots = images.length ? images : [];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);

  if (shots.length === 0) {
    return (
      <div className="bg-gradient-to-b from-surface to-surface-2 rounded-card aspect-[3/4] flex items-center justify-center">
        <span className="font-display text-7xl text-line select-none">
          {name.slice(0, 2)}
        </span>
      </div>
    );
  }

  const current = shots[active];

  return (
    <div>
      <div
        className="relative bg-surface-2 rounded-card aspect-[3/4] flex items-center justify-center overflow-hidden cursor-zoom-in group"
        onClick={() => setZoom(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt={name}
          className="w-full h-full object-cover"
        />

        {/* 左右翻页箭头（多图时显示，悬停浮现） */}
        {shots.length > 1 && (
          <>
            <button
              aria-label={dict.common.previousImage}
              onClick={(e) => {
                e.stopPropagation();
                setActive((a) => (a === 0 ? shots.length - 1 : a - 1));
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 shadow-soft flex items-center justify-center text-ink opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              aria-label={dict.common.nextImage}
              onClick={(e) => {
                e.stopPropagation();
                setActive((a) => (a + 1) % shots.length);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 shadow-soft flex items-center justify-center text-ink opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {/* 图片序号指示：如 2/3 */}
            <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/45 text-white text-xs tnum select-none pointer-events-none">
              {active + 1}/{shots.length}
            </span>
          </>
        )}
      </div>

      {shots.length > 1 && (
        <div className="flex gap-3 mt-3">
          {shots.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-20 h-24 rounded overflow-hidden border-2 transition-colors ${
                i === active ? 'border-ink' : 'border-line hover:border-ink/50'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s} alt={name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 cursor-zoom-out"
          onClick={() => setZoom(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
