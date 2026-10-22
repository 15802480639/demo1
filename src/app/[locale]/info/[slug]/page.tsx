import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getSettings } from '@/lib/geo';

const TITLES: Record<string, (d: ReturnType<typeof getDictionary>) => string> = {
  privacy: (d) => d.footer.privacy,
  terms: (d) => d.footer.terms,
  shipping: (d) => d.footer.shipping,
  returns: (d) => d.footer.returns,
  faq: (d) => d.footer.faq,
  contact: (d) => d.footer.contact,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);
  const titleFn = TITLES[slug];
  if (!titleFn) return { title: dict.common.notFound };
  return { title: titleFn(dict), alternates: { canonical: `/${loc}/info/${slug}` } };
}

export default async function InfoPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const titleFn = TITLES[slug];
  if (!titleFn) notFound();

  // 正文优先读后台（SiteSetting：info.<slug>.<locale>，按空行分段），
  // 没填则回落默认文案，页面永不空白。
  let paragraphs: string[] = [dict.home.seoBody, dict.info.demoNotice];
  try {
    const settings = await getSettings();
    const body = (settings[`info.${slug}.${loc}`] ?? '').trim();
    if (body) {
      paragraphs = body
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
    }
  } catch {
    // 读库失败回落默认文案
  }

  return (
    <div className="mx-auto max-w-[800px] px-4 sm:px-8 py-14">
      <h1 className="font-display text-4xl sm:text-5xl text-ink mb-2">
        {titleFn(dict)}
      </h1>
      <div className="luxe-rule mb-8" />
      <div className="space-y-5 text-ink-soft text-sm leading-relaxed whitespace-pre-line">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}
