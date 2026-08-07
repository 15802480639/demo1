import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

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
  if (!titleFn) return { title: 'Not found' };
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

  const paragraphs = [
    dict.home.seoBody,
    '본 페이지는 데모 콘텐츠입니다. 실제 운영 전 법무 검토를 거친 정식 약관으로 교체해 주세요.',
  ];

  return (
    <div className="mx-auto max-w-[800px] px-4 sm:px-8 py-14">
      <h1 className="font-display text-4xl sm:text-5xl text-ink mb-2">
        {titleFn(dict)}
      </h1>
      <div className="luxe-rule mb-8" />
      <div className="space-y-5 text-ink-soft text-sm leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}
