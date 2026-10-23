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
  // 兜底渐变（图片未配置 / 加载失败时用）—— 2026-10-23 改为浅色系，
  // 原深色渐变是"整体沉重"的第二大来源。
  'linear-gradient(115deg, #faf8f4 0%, #f0e9de 52%, #e6dccb 100%)',
  'linear-gradient(115deg, #fbf8f3 0%, #f3ead9 55%, #e3d3c0 130%)',
  'linear-gradient(115deg, #f7f7f6 0%, #eceef0 55%, #e2e6e8 100%)',
];

/**
 * 判断横幅图是「亮图」还是「暗图」，用于自适应文字颜色。
 * 亮图 → 深色文字 + 极浅遮罩（保持画面通透）
 * 暗图 → 白色文字 + 中等遮罩（保证可读）
 *
 * 用离屏 canvas 取样平均亮度；跨域/失败时保守回落为暗图。
 */
function detectTone(
  url: string,
  cb: (tone: 'light' | 'dark') => void,
): void {
  if (typeof window === 'undefined') return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      const w = 32;
      const h = 32;
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return cb('dark');
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let sum = 0;
      let n = 0;
      for (let i = 0; i < data.length; i += 4) {
        // 感知亮度（Rec.709）
        sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        n++;
      }
      const avg = n ? sum / n : 0;
      cb(avg > 150 ? 'light' : 'dark');
    } catch {
      // 跨域导致 canvas 被污染 → 回落暗图（安全侧）
      cb('dark');
    }
  };
  img.onerror = () => cb('dark');
  img.src = url;
}

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
  /** 每屏图片的明暗：'light' = 亮图（用深色文字），'dark' = 暗图（用白色文字） */
  const [tones, setTones] = useState<Record<number, 'light' | 'dark'>>({});

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

  // 检测每屏图片明暗 → 决定文字颜色与遮罩强度（亮图保持通透，暗图保证可读）
  useEffect(() => {
    let alive = true;
    slides.forEach((s, i) => {
      if (!s.image) return;
      detectTone(s.image, (tone) => {
        if (!alive) return;
        setTones((prev) => (prev[i] === tone ? prev : { ...prev, [i]: tone }));
      });
    });
    return () => {
      alive = false;
    };
  }, [slides.map((s) => s.image).join('|')]);

  if (slides.length === 0) return null;

  const go = (n: number) => setIndex(((n % count) + count) % count);
  const current = slides[index];
  const tone = tones[index] ?? 'dark';
  const isLight = tone === 'light';

  return (
    <section
      // 容器底色改浅米白：图片未加载时不再是一块黑
      className="relative w-full overflow-hidden bg-bg"
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
      {slides.map((s, i) => {
        const slideLight = (tones[i] ?? 'dark') === 'light';
        return (
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
          {/* 可读性遮罩（2026-10-23 提亮）：
              亮图 → 极浅的暖白渐变，保持画面通透，文字用深色
              暗图 → 中等暗色渐变，保证白字可读 */}
          {slideLight ? (
            <>
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,253,249,0.30),rgba(255,253,249,0.10)_40%,rgba(255,253,249,0.52))]" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,253,249,0.42),rgba(255,253,249,0.02)_64%)]" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(20,17,15,0.42),rgba(20,17,15,0.12)_40%,rgba(20,17,15,0.55))]" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(20,17,15,0.52),rgba(20,17,15,0.03)_64%)]" />
            </>
          )}
        </div>
        );
      })}

      {/* ---------- 文案层（只渲染当前屏，保证每次切换都有入场动画） ---------- */}
      <div className="absolute inset-0 flex items-end sm:items-center">
        <div className="mx-auto w-full max-w-[1400px] px-6 sm:px-12 pb-32 sm:pb-0">
          <div key={index} className="max-w-3xl">
            <p
              className={`hero-line tracking-luxe text-[11px] sm:text-xs mb-5 sm:mb-6 ${
                isLight ? 'text-accent-strong' : 'text-accent'
              }`}
              style={{ animationDelay: '60ms' }}
            >
              {current.eyebrow || dict.home.heroEyebrow}
            </p>
            <h1
              className={`hero-line font-display text-[2.6rem] leading-[1.03] sm:text-6xl lg:text-[5.25rem] tracking-tight text-balance ${
                isLight ? 'text-ink' : 'text-white'
              }`}
            >
              {current.title}
            </h1>
            {current.subtitle && (
              <p
                className={`hero-line mt-5 sm:mt-6 text-base sm:text-xl font-light max-w-xl ${
                  isLight ? 'text-ink-soft' : 'text-white/85'
                }`}
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
                className={
                  isLight
                    ? 'btn-outline border-ink/40 text-ink px-7 py-4 sm:px-9 hover:bg-ink hover:text-white hover:border-ink'
                    : 'btn-outline border-white/70 text-white px-7 py-4 sm:px-9 hover:bg-white hover:text-ink hover:border-white'
                }
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
                  <span
                    className={`block h-[2px] w-9 sm:w-14 overflow-hidden ${
                      isLight ? 'bg-ink/20' : 'bg-white/30'
                    }`}
                  >
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
            <span
              className={`font-display text-2xl sm:text-3xl tabular-nums ${
                isLight ? 'text-ink' : 'text-white'
              }`}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <span
              className={`h-px w-7 sm:w-8 ${isLight ? 'bg-ink/30' : 'bg-white/40'}`}
            />
            <span
              className={`font-display text-2xl sm:text-3xl tabular-nums ${
                isLight ? 'text-ink/50' : 'text-white/50'
              }`}
            >
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
            className={`hidden sm:flex absolute left-6 sm:left-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border items-center justify-center text-2xl leading-none hover:border-accent hover:text-accent transition-colors ${
              isLight ? 'border-ink/25 text-ink' : 'border-white/35 text-white'
            }`}
          >
            ‹
          </button>
          <button
            aria-label={dict.common.nextSlide}
            onClick={() => go(index + 1)}
            className={`hidden sm:flex absolute right-6 sm:right-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border items-center justify-center text-2xl leading-none hover:border-accent hover:text-accent transition-colors ${
              isLight ? 'border-ink/25 text-ink' : 'border-white/35 text-white'
            }`}
          >
            ›
          </button>
        </>
      )}
    </section>
  );
}
