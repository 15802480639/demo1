'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';

export type Banner = {
  id: string;
  image: string;
  title?: string | null;
  titleZh?: string | null;
  titleKo?: string | null;
  subtitle?: string | null;
  subtitleZh?: string | null;
  subtitleKo?: string | null;
  cta?: string | null;
  ctaZh?: string | null;
  ctaKo?: string | null;
  href?: string | null;
};

type Slide = {
  image?: string;
  eyebrow?: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
};

const SLIDE_BG = [
  'linear-gradient(115deg, #14110f 0%, #24352a 52%, #33452f 100%)',
  'linear-gradient(115deg, #14110f 0%, #3a2f22 55%, #b0894f 130%)',
  'linear-gradient(115deg, #101418 0%, #1d2b33 55%, #2f4a52 100%)',
];

/** 按当前语种挑选字段：ko → zh → en 依次回落 */
function pick(
  locale: string,
  ko?: string | null,
  zh?: string | null,
  en?: string | null,
): string {
  if (locale === 'ko') return ko || en || zh || '';
  if (locale === 'zh') return zh || en || ko || '';
  return en || ko || zh || '';
}

export function HeroCarousel({
  banners,
  fallbackImages = [],
  duration = 6800,
}: {
  banners?: Banner[];
  /** 后台未配置 / 配置缺图时，按顺序取用的商品大图 */
  fallbackImages?: string[];
  /** 每屏停留毫秒 */
  duration?: number;
}) {
  const { locale, dict } = useLocale();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // 后台配置优先；否则用字典文案 + 商品实拍图兜底
  const built: Slide[] = (banners && banners.length
    ? banners.map((b, i) => ({
        image: b.image || fallbackImages[i % Math.max(fallbackImages.length, 1)],
        title: pick(locale, b.titleKo, b.titleZh, b.title),
        subtitle: pick(locale, b.subtitleKo, b.subtitleZh, b.subtitle),
        cta: pick(locale, b.ctaKo, b.ctaZh, b.cta) || dict.nav.shop,
        href: b.href || `/${locale}/products`,
      }))
    : (dict.home.heroSlides as Slide[]).map((s, i) => ({
        image: fallbackImages[i % Math.max(fallbackImages.length, 1)],
        eyebrow: s.eyebrow,
        title: s.title,
        subtitle: s.subtitle,
        cta: s.cta,
        href: `/${locale}/products`,
      }))
  ).filter((s) => s.title || s.subtitle || s.image);

  const slides = built;
  const count = slides.length || 1;

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), duration);
    return () => clearInterval(t);
  }, [slides.length, paused, duration]);

  useEffect(() => {
    if (slides.length < 2) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + slides.length) % slides.length);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % slides.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const go = (n: number) => setIndex(((n % count) + count) % count);
  const current = slides[index];

  return (
    <section
      className="relative w-full overflow-hidden bg-[#14110f] text-white"
      style={{ height: '100svh', minHeight: 560 }}
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 48) go(index + (dx < 0 ? 1 : -1));
        touchStartX.current = null;
      }}
    >
      {/* ---------- 背景层 ---------- */}
      {slides.map((s, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${
            i === index ? 'opacity-100 hero-slide-active' : 'opacity-0'
          }`}
          aria-hidden={i !== index}
        >
          {/* 兜底渐变：图片未配置或加载失败时也不会黑屏 */}
          <div
            className="absolute inset-0"
            style={{ background: SLIDE_BG[i % SLIDE_BG.length] }}
          />
          <div
            className="hero-bg absolute inset-0"
            style={
              s.image
                ? {
                    backgroundImage: `url("${s.image}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }
                : undefined
            }
          />
          {/* 可读性遮罩：整体压暗 + 左侧压暗 + 底部渐深 */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(12,10,9,0.58),rgba(12,10,9,0.18)_40%,rgba(12,10,9,0.74))]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(12,10,9,0.66),rgba(12,10,9,0.04)_64%)]" />
        </div>
      ))}

      {/* ---------- 文案层（只渲染当前屏，保证每次切换都有入场动画） ---------- */}
      <div className="absolute inset-0 flex items-end sm:items-center">
        <div className="mx-auto w-full max-w-[1400px] px-6 sm:px-12 pb-32 sm:pb-0">
          <div key={index} className="max-w-3xl">
            <p
              className="hero-line tracking-luxe text-[11px] sm:text-xs text-accent mb-5 sm:mb-6"
              style={{ animationDelay: '60ms' }}
            >
              {current.eyebrow || dict.home.heroEyebrow}
            </p>
            <h1 className="hero-line font-display text-[2.6rem] leading-[1.03] sm:text-6xl lg:text-[5.25rem] tracking-tight text-balance">
              {current.title}
            </h1>
            {current.subtitle && (
              <p
                className="hero-line mt-5 sm:mt-6 text-base sm:text-xl text-white/85 font-light max-w-xl"
                style={{ animationDelay: '240ms' }}
              >
                {current.subtitle}
              </p>
            )}
            <div
              className="hero-line mt-9 sm:mt-11 flex flex-wrap gap-3 sm:gap-4"
              style={{ animationDelay: '420ms' }}
            >
              <Link
                href={current.href}
                className="btn-gold px-7 py-4 sm:px-9"
                style={{
                  background: 'var(--color-accent)',
                  borderColor: 'var(--color-accent)',
                }}
              >
                {current.cta || dict.nav.shop}
              </Link>
              <Link
                href={`/${locale}/products?sale=1`}
                className="btn-outline border-white/70 text-white px-7 py-4 sm:px-9 hover:bg-white hover:text-ink hover:border-white"
              >
                {dict.nav.sale}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- 进度指示器 + 计数 ---------- */}
      <div className="absolute bottom-8 sm:bottom-10 left-0 right-0">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-12 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2 sm:gap-3">
            {slides.length > 1 &&
              slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  aria-label={dict.common.goToSlide.replace('{n}', String(i + 1))}
                  className="py-3 px-1 -mx-1"
                >
                  <span className="block h-[2px] w-9 sm:w-14 bg-white/30 overflow-hidden">
                    <span
                      key={i === index ? `active-${index}` : `idle-${i}`}
                      className="block h-full w-full origin-left"
                      style={{
                        background: 'var(--color-accent)',
                        transform:
                          i < index ? 'scaleX(1)' : i === index ? undefined : 'scaleX(0)',
                        animation:
                          i === index
                            ? `hero-progress ${duration}ms linear forwards`
                            : undefined,
                        animationPlayState: paused ? 'paused' : 'running',
                      }}
                    />
                  </span>
                </button>
              ))}
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className="font-display text-2xl sm:text-3xl tabular-nums">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="h-px w-7 sm:w-8 bg-white/40" />
            <span className="font-display text-2xl sm:text-3xl text-white/50 tabular-nums">
              {String(count).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* ---------- 左右箭头（桌面） ---------- */}
      {slides.length > 1 && (
        <>
          <button
            aria-label={dict.common.previousSlide}
            onClick={() => go(index - 1)}
            className="hidden sm:flex absolute left-6 sm:left-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-white/35 items-center justify-center text-2xl leading-none hover:border-accent hover:text-accent transition-colors"
          >
            ‹
          </button>
          <button
            aria-label={dict.common.nextSlide}
            onClick={() => go(index + 1)}
            className="hidden sm:flex absolute right-6 sm:right-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-white/35 items-center justify-center text-2xl leading-none hover:border-accent hover:text-accent transition-colors"
          >
            ›
          </button>
        </>
      )}
    </section>
  );
}
