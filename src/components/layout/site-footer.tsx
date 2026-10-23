'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import { siteConfig } from '@/lib/site';

/** 双语文本：旧数据是字符串，新数据是 { ko, zh }（en 回落 zh → ko → 默认） */
type LocText = string | { ko?: string; zh?: string; en?: string } | null | undefined;

type FooterLink = { label?: LocText; href?: string };
type FooterColumn = { title?: LocText; links?: FooterLink[] };
type FooterConfig = {
  brandName?: LocText;
  brandDesc?: LocText;
  youtube?: string;
  instagram?: string;
  columns?: FooterColumn[];
  copyright?: LocText;
  contactLine?: LocText;
};

/** 按当前语言取文本；取不到按 中 → 韩 → 英 回落；再取不到返回空串由调用方用默认值 */
function locText(v: LocText, locale: string): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  const o = v as Record<string, string>;
  return o[locale] || o.zh || o.ko || o.en || '';
}

/** 已知链接回落到对应语言的词典标签 */
function dictLabelFor(href: string, f: any, dict: any): string | null {
  if (!href) return null;
  if (href.includes('/brands')) return dict.nav.brands;
  if (href.includes('new=1')) return dict.nav.newArrivals;
  if (href.includes('/events')) return dict.nav.events;
  if (href.includes('/info/shipping')) return f.shipping;
  if (href.includes('/info/returns')) return f.returns;
  if (href.includes('/faq')) return dict.faq.heading;
  if (href.includes('/info/contact')) return f.contact;
  if (href.includes('/info/privacy')) return f.privacy;
  if (href.includes('/info/terms')) return f.terms;
  return null;
}

export function SiteFooter() {
  const { locale, dict } = useLocale();
  const f = dict.footer;
  const year = new Date().getFullYear();
  const [cfg, setCfg] = useState<FooterConfig | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/site-content')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.footer) setCfg(d.footer as FooterConfig);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 默认三栏（后台没配时用）
  const defaultColumns: FooterColumn[] = [
    {
      title: f.about,
      links: [
        { label: dict.nav.brands, href: `/${locale}/brands` },
        { label: dict.nav.newArrivals, href: `/${locale}/products?new=1` },
        { label: dict.nav.events, href: `/${locale}/events` },
      ],
    },
    {
      title: f.help,
      links: [
        { label: f.shipping, href: `/${locale}/info/shipping` },
        { label: f.returns, href: `/${locale}/info/returns` },
        { label: dict.faq.heading, href: `/${locale}/faq` },
        { label: f.contact, href: `/${locale}/info/contact` },
      ],
    },
    {
      title: f.policy,
      links: [
        { label: f.privacy, href: `/${locale}/info/privacy` },
        { label: f.terms, href: `/${locale}/info/terms` },
      ],
    },
  ];

  // 后台配置的栏目：链接地址统一补上当前语言前缀；标签按语言取值，留空则回落词典默认
  const columns: { title: string; links: { label: string; href: string }[] }[] =
    cfg?.columns && cfg.columns.length
      ? cfg.columns.map((col, i) => ({
          title: locText(col.title, locale) || locText(defaultColumns[i]?.title, locale) || '',
          links: (col.links ?? [])
            .filter((l) => l.href)
            .map((l) => {
              let href = l.href!;
              if (href.startsWith('/') && !href.startsWith(`/${locale}`)) {
                href = `/${locale}${href}`;
              }
              return {
                label: locText(l.label, locale) || dictLabelFor(l.href!, f, dict) || l.href!,
                href,
              };
            }),
        }))
      : defaultColumns.map((col) => ({
          title: locText(col.title, locale),
          links: (col.links ?? []).map((l) => ({ label: locText(l.label, locale), href: l.href! })),
        }));

  const brandDesc = locText(cfg?.brandDesc, locale) || dict.home.seoBody;
  const youtube = cfg?.youtube || siteConfig.youtube;
  const instagram = cfg?.instagram || siteConfig.instagram;
  const copyright =
    locText(cfg?.copyright, locale) ||
    `${f.copyright} ${year} ${siteConfig.company.name} — ${dict.common.allRights}`;
  const contactLine =
    locText(cfg?.contactLine, locale) || `${siteConfig.company.email} · ${siteConfig.company.tel}`;

  return (
    // 2026-10-23 客户要求整体提亮：页脚由近黑底改为浅米白底 + 香槟金细线，
    // 呈现高级买手店质感（原 bg-ink 整块深色是"沉重感"最大来源）。
    <footer className="bg-cream border-t border-line mt-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* brand block */}
          <div className="col-span-2 md:col-span-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={siteConfig.logo}
              alt={siteConfig.nameKo}
              width={140}
              height={71}
              className="h-9 w-auto mb-4"
            />
            <p className="text-sm leading-relaxed text-ink-soft max-w-xs">{brandDesc}</p>
            <div className="flex gap-4 mt-6">
              {youtube && (
                <a href={youtube} className="text-ink-soft hover:text-accent transition-colors text-sm">
                  YouTube
                </a>
              )}
              {instagram && (
                <a href={instagram} className="text-ink-soft hover:text-accent transition-colors text-sm">
                  Instagram
                </a>
              )}
            </div>
          </div>

          {columns.map((col, i) => (
            <div key={i}>
              <h4 className="text-ink text-sm tracking-wide mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((l, j) => (
                  <li key={j}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted hover:text-accent transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="luxe-rule my-10 bg-line" />

        <div className="flex flex-col sm:flex-row justify-between gap-4 text-xs text-muted">
          <p>{copyright}</p>
          <p>{contactLine}</p>
        </div>
      </div>
    </footer>
  );
}
