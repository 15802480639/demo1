'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';

const SLIDE_BG = [
  'linear-gradient(115deg, #1a1714 0%, #2c3a2e 55%, #3a4a3c 100%)',
  'linear-gradient(115deg, #1a1714 0%, #3b2f22 60%, #b0894f 130%)',
];

export function HeroCarousel() {
  const { locale, dict } = useLocale();
  const slides = dict.home.heroSlides;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      6000,
    );
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <section className="relative h-[78vh] min-h-[520px] w-full overflow-hidden text-white">
      {slides.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            background: SLIDE_BG[i % SLIDE_BG.length],
            opacity: i === index ? 1 : 0,
          }}
        >
          {/* decorative grain / vignette */}
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-[1400px] px-6 sm:px-12">
              <p className="tracking-luxe text-xs sm:text-sm text-accent mb-5">
                {s.eyebrow}
              </p>
              <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl leading-[0.95] max-w-3xl">
                {s.title}
              </h1>
              <p className="mt-6 text-lg sm:text-2xl text-white/80 font-light max-w-xl">
                {s.subtitle}
              </p>
              <Link
                href={`/${locale}/products`}
                className="btn-gold mt-10"
                style={{ background: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}
              >
                {s.cta}
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* pagination 01 / 02 */}
      <div className="absolute bottom-10 left-6 sm:left-12 flex items-center gap-4">
        <span className="font-display text-2xl text-white">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="h-px w-10 bg-white/40" />
        <span className="font-display text-2xl text-white/50">
          {String(slides.length).padStart(2, '0')}
        </span>
      </div>

      {/* arrows */}
      <button
        aria-label="prev"
        onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
        className="absolute right-20 bottom-10 w-11 h-11 border border-white/30 hover:border-accent hover:text-accent transition-colors flex items-center justify-center"
      >
        ‹
      </button>
      <button
        aria-label="next"
        onClick={() => setIndex((i) => (i + 1) % slides.length)}
        className="absolute right-6 sm:right-12 bottom-10 w-11 h-11 border border-white/30 hover:border-accent hover:text-accent transition-colors flex items-center justify-center"
      >
        ›
      </button>
    </section>
  );
}
