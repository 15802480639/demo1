'use client';

import { useState } from 'react';

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
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
        className="bg-surface-2 rounded-card aspect-[3/4] flex items-center justify-center overflow-hidden cursor-zoom-in"
        onClick={() => setZoom(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt={name}
          className="w-full h-full object-cover"
        />
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
