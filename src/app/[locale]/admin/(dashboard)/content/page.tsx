'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';

type EventItem = {
  id: string;
  title: string;
  titleZh: string | null;
  subtitle: string | null;
  subtitleZh: string | null;
  badge: string | null;
  imageUrl: string | null;
  href: string | null;
  order: number;
  status: string;
};

/** 双语文本：韩文 + 中文各一套 */
type BiText = { ko: string; zh: string };
type FooterLinkEdit = { label: BiText; href: string };
type FooterColumnEdit = { title: BiText; links: FooterLinkEdit[] };

/** 把库里读出的值统一转成双语结构：旧字符串两边都填（用户可分别改），新对象照搬 */
function toBi(v: unknown): BiText {
  if (v && typeof v === 'object') {
    const o = v as { ko?: string; zh?: string };
    return { ko: o.ko ?? '', zh: o.zh ?? '' };
  }
  const s = typeof v === 'string' ? v : '';
  return { ko: s, zh: s };
}

const emptyBi = (): BiText => ({ ko: '', zh: '' });

/** 固定页面正文：slug 对应前台 /info/<slug>，正文存 SiteSetting 键 info.<slug>.<locale>；label 走字典键 */
const INFO_PAGE_DEFS: { slug: string; key: 'ctShipping' | 'ctReturns' | 'ctContact' | 'ctPrivacy' | 'ctTerms' }[] = [
  { slug: 'shipping', key: 'ctShipping' },
  { slug: 'returns', key: 'ctReturns' },
  { slug: 'contact', key: 'ctContact' },
  { slug: 'privacy', key: 'ctPrivacy' },
  { slug: 'terms', key: 'ctTerms' },
];
type InfoPagesState = Record<string, { ko: string; zh: string; en: string }>;
const emptyInfoPages = (): InfoPagesState =>
  Object.fromEntries(INFO_PAGE_DEFS.map((d) => [d.slug, { ko: '', zh: '', en: '' }]));

const DEFAULT_FOOTER_COLUMNS: FooterColumnEdit[] = [
  {
    title: emptyBi(),
    links: [
      { label: emptyBi(), href: '/brands' },
      { label: emptyBi(), href: '/products?new=1' },
      { label: emptyBi(), href: '/events' },
    ],
  },
  {
    title: emptyBi(),
    links: [
      { label: emptyBi(), href: '/info/shipping' },
      { label: emptyBi(), href: '/info/returns' },
      { label: emptyBi(), href: '/faq' },
      { label: emptyBi(), href: '/info/contact' },
    ],
  },
  {
    title: emptyBi(),
    links: [
      { label: emptyBi(), href: '/info/privacy' },
      { label: emptyBi(), href: '/info/terms' },
    ],
  },
];

export default function AdminContentPage() {
  const { dict } = useLocale();
  const t = dict.admin;
  const [footer, setFooter] = useState({
    brandName: emptyBi(),
    brandDesc: emptyBi(),
    youtube: '',
    instagram: '',
    copyright: emptyBi(),
    contactLine: emptyBi(),
    columns: DEFAULT_FOOTER_COLUMNS,
  });
  const [footerSaved, setFooterSaved] = useState(false);
  const [footerSaving, setFooterSaving] = useState(false);
  const [homeSeo, setHomeSeo] = useState({
    heading: { ko: '', zh: '', en: '' },
    body: { ko: '', zh: '', en: '' },
  });
  const [homeSeoSaved, setHomeSeoSaved] = useState(false);
  const [homeSeoSaving, setHomeSeoSaving] = useState(false);
  const [infoPages, setInfoPages] = useState<InfoPagesState>(emptyInfoPages);
  const [infoSaved, setInfoSaved] = useState(false);
  const [infoSaving, setInfoSaving] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formKey, setFormKey] = useState('new');

  useEffect(() => {
    (async () => {
      const [r1, r2, r3] = await Promise.all([
        fetch('/api/site-content'),
        fetch('/api/admin/events'),
        fetch('/api/admin/settings'),
      ]);
      if (r1.ok) {
        const d = await r1.json();
        if (d.homeSeo) {
          const h = d.homeSeo as Record<string, string>;
          setHomeSeo({
            heading: {
              ko: h['home.seoHeading.ko'] ?? '',
              zh: h['home.seoHeading.zh'] ?? '',
              en: h['home.seoHeading.en'] ?? '',
            },
            body: {
              ko: h['home.seoBody.ko'] ?? '',
              zh: h['home.seoBody.zh'] ?? '',
              en: h['home.seoBody.en'] ?? '',
            },
          });
        }
        if (d.footer) {
          const fc = d.footer as {
            brandName?: unknown;
            brandDesc?: unknown;
            youtube?: string;
            instagram?: string;
            copyright?: unknown;
            contactLine?: unknown;
            columns?: { title?: unknown; links?: { label?: unknown; href?: string }[] }[];
          };
          setFooter((prev) => ({
            brandName: toBi(fc.brandName),
            brandDesc: toBi(fc.brandDesc),
            youtube: fc.youtube ?? '',
            instagram: fc.instagram ?? '',
            copyright: toBi(fc.copyright),
            contactLine: toBi(fc.contactLine),
            columns:
              fc.columns && fc.columns.length
                ? fc.columns.map((c) => ({
                    title: toBi(c.title),
                    links: (c.links ?? []).map((l) => ({
                      label: toBi(l.label),
                      href: l.href ?? '',
                    })),
                  }))
                : prev.columns,
          }));
        }
      }
      if (r2.ok) {
        const d = await r2.json();
        setEvents(d.events ?? []);
      }
      if (r3.ok) {
        const d = await r3.json();
        const s = (d.settings ?? {}) as Record<string, string>;
        setInfoPages((prev) => {
          const next: InfoPagesState = { ...prev };
          for (const def of INFO_PAGE_DEFS) {
            next[def.slug] = {
              ko: s[`info.${def.slug}.ko`] ?? '',
              zh: s[`info.${def.slug}.zh`] ?? '',
              en: s[`info.${def.slug}.en`] ?? '',
            };
          }
          return next;
        });
      }
      setLoading(false);
    })();
  }, []);

  async function removeEvent(id: string) {
    if (!confirm(t.deleteConfirm)) return;
    const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
    if (res.ok) setEvents((es) => es.filter((e) => e.id !== id));
  }

  async function saveHomeSeo() {
    setHomeSeoSaving(true);
    setHomeSeoSaved(false);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: {
          'home.seoHeading.ko': homeSeo.heading.ko,
          'home.seoHeading.zh': homeSeo.heading.zh,
          'home.seoHeading.en': homeSeo.heading.en,
          'home.seoBody.ko': homeSeo.body.ko,
          'home.seoBody.zh': homeSeo.body.zh,
          'home.seoBody.en': homeSeo.body.en,
        },
      }),
    });
    setHomeSeoSaving(false);
    setHomeSeoSaved(res.ok);
    setTimeout(() => setHomeSeoSaved(false), 3000);
  }

  /** 保存固定页面正文（隐私政策 / 服务条款等，ko/zh/en × 5 页 = 15 键） */
  async function saveInfoPages() {
    setInfoSaving(true);
    setInfoSaved(false);
    const settings: Record<string, string> = {};
    for (const def of INFO_PAGE_DEFS) {
      const v = infoPages[def.slug] ?? { ko: '', zh: '', en: '' };
      settings[`info.${def.slug}.ko`] = v.ko;
      settings[`info.${def.slug}.zh`] = v.zh;
      settings[`info.${def.slug}.en`] = v.en;
    }
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    setInfoSaving(false);
    setInfoSaved(res.ok);
    setTimeout(() => setInfoSaved(false), 3000);
  }

  async function saveFooter() {
    setFooterSaving(true);
    setFooterSaved(false);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: { 'footer.config': JSON.stringify(footer) },
      }),
    });
    setFooterSaving(false);
    setFooterSaved(res.ok);
    setTimeout(() => setFooterSaved(false), 3000);
  }

  const footerInput =
    'w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent';

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl text-ink">{t.ctPageTitle}</h1>
        <p className="text-xs text-muted mt-1">{t.ctIntro}</p>
      </div>

      {/* 首页介绍文案 */}
      <section className="border border-line bg-surface p-5 space-y-4 max-w-2xl">
        <div>
          <h2 className="font-display text-xl text-ink">{t.ctHomeSection}</h2>
          <p className="text-xs text-muted mt-1">{t.ctHomeHint}</p>
        </div>
        <div>
          <label className="text-xs tracking-widest text-muted block mb-1">{t.ctLabelTitle}</label>
          <div className="space-y-2">
            <input
              className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              value={homeSeo.heading.ko}
              onChange={(e) => setHomeSeo((s) => ({ ...s, heading: { ...s.heading, ko: e.target.value } }))}
              placeholder={t.ctPhTitleKo}
            />
            <input
              className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              value={homeSeo.heading.zh}
              onChange={(e) => setHomeSeo((s) => ({ ...s, heading: { ...s.heading, zh: e.target.value } }))}
              placeholder={t.ctPhTitleZh}
            />
            <input
              className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              value={homeSeo.heading.en}
              onChange={(e) => setHomeSeo((s) => ({ ...s, heading: { ...s.heading, en: e.target.value } }))}
              placeholder={t.ctPhTitleEn}
            />
          </div>
        </div>
        <div>
          <label className="text-xs tracking-widest text-muted block mb-1">{t.ctLabelBody}</label>
          <div className="space-y-2">
            <textarea
              className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              rows={2}
              value={homeSeo.body.ko}
              onChange={(e) => setHomeSeo((s) => ({ ...s, body: { ...s.body, ko: e.target.value } }))}
              placeholder={t.ctPhBodyKo}
            />
            <textarea
              className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              rows={2}
              value={homeSeo.body.zh}
              onChange={(e) => setHomeSeo((s) => ({ ...s, body: { ...s.body, zh: e.target.value } }))}
              placeholder={t.ctPhBodyZh}
            />
            <textarea
              className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              rows={2}
              value={homeSeo.body.en}
              onChange={(e) => setHomeSeo((s) => ({ ...s, body: { ...s.body, en: e.target.value } }))}
              placeholder={t.ctPhBodyEn}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveHomeSeo} disabled={homeSeoSaving} className="btn-gold">
            {homeSeoSaving ? t.ctSaving : t.ctSaveHome}
          </button>
          {homeSeoSaved && <span className="text-xs text-emerald-600">✓ {t.ctSaved}</span>}
        </div>
      </section>

      {/* 固定页面正文（隐私政策 / 服务条款等） */}
      <section className="border border-line bg-surface p-5 space-y-5 max-w-3xl">
        <div>
          <h2 className="font-display text-xl text-ink">{t.ctInfoSection}</h2>
          <p className="text-xs text-muted mt-1">{t.ctInfoHint}</p>
        </div>

        <div className="space-y-6">
          {INFO_PAGE_DEFS.map((def) => {
            const v = infoPages[def.slug] ?? { ko: '', zh: '', en: '' };
            const set = (loc: 'ko' | 'zh' | 'en', val: string) =>
              setInfoPages((s) => ({ ...s, [def.slug]: { ...v, [loc]: val } }));
            const label = t[def.key];
            const name = label.split(/[（(]/)[0];
            const langLabel = (loc: 'ko' | 'zh' | 'en') =>
              loc === 'ko' ? t.ctLangKo : loc === 'zh' ? t.ctLangZh : t.ctLangEn;
            return (
              <div key={def.slug} className="border border-line p-4 space-y-2">
                <div className="text-sm font-medium text-ink">{label}</div>
                {(['ko', 'zh', 'en'] as const).map((loc) => (
                  <div key={loc}>
                    <span className="text-[10px] text-muted block mb-0.5">{langLabel(loc)}</span>
                    <textarea
                      className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
                      rows={8}
                      value={v[loc]}
                      onChange={(e) => set(loc, e.target.value)}
                      placeholder={t.ctPhInfoBody.replace('{name}', name).replace('{lang}', langLabel(loc))}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={saveInfoPages} disabled={infoSaving} className="btn-gold">
            {infoSaving ? t.ctSaving : t.ctSaveInfo}
          </button>
          {infoSaved && <span className="text-xs text-emerald-600">✓ {t.ctSaved}</span>}
        </div>
      </section>

      {/* 页脚管理 */}
      <section className="border border-line bg-surface p-5 space-y-5 max-w-3xl">
        <div>
          <h2 className="font-display text-xl text-ink">{t.ctFooterSection}</h2>
          <p className="text-xs text-muted mt-1">{t.ctFooterHint}</p>
        </div>

        <div className="space-y-4">
          {/* 品牌名（双语） */}
          <div>
            <label className="text-xs tracking-widest text-muted block mb-1">{t.ctBrandName}</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-muted block mb-0.5">{t.ctLangKo}</span>
                <input
                  className={footerInput}
                  value={footer.brandName.ko}
                  onChange={(e) => setFooter((f) => ({ ...f, brandName: { ...f.brandName, ko: e.target.value } }))}
                  placeholder={t.ctDefaultJD}
                />
              </div>
              <div>
                <span className="text-[10px] text-muted block mb-0.5">{t.ctLangZh}</span>
                <input
                  className={footerInput}
                  value={footer.brandName.zh}
                  onChange={(e) => setFooter((f) => ({ ...f, brandName: { ...f.brandName, zh: e.target.value } }))}
                  placeholder={t.ctDefaultJD}
                />
              </div>
            </div>
          </div>

          {/* YouTube / Instagram（URL 单套） */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">{t.ctYoutube}</label>
              <input
                className={footerInput}
                value={footer.youtube}
                onChange={(e) => setFooter((f) => ({ ...f, youtube: e.target.value }))}
                placeholder={t.ctPhDefault}
              />
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">{t.ctInstagram}</label>
              <input
                className={footerInput}
                value={footer.instagram}
                onChange={(e) => setFooter((f) => ({ ...f, instagram: e.target.value }))}
                placeholder={t.ctPhDefault}
              />
            </div>
          </div>

          {/* 联系信息行（双语） */}
          <div>
            <label className="text-xs tracking-widest text-muted block mb-1">{t.ctContactRow}</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-muted block mb-0.5">{t.ctLangKo}</span>
                <input
                  className={footerInput}
                  value={footer.contactLine.ko}
                  onChange={(e) => setFooter((f) => ({ ...f, contactLine: { ...f.contactLine, ko: e.target.value } }))}
                  placeholder={t.ctPhContact}
                />
              </div>
              <div>
                <span className="text-[10px] text-muted block mb-0.5">{t.ctLangZh}</span>
                <input
                  className={footerInput}
                  value={footer.contactLine.zh}
                  onChange={(e) => setFooter((f) => ({ ...f, contactLine: { ...f.contactLine, zh: e.target.value } }))}
                  placeholder={t.ctPhContact}
                />
              </div>
            </div>
          </div>

          {/* 品牌简介（双语） */}
          <div>
            <label className="text-xs tracking-widest text-muted block mb-1">{t.ctBrandIntro}</label>
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-muted block mb-0.5">{t.ctLangKo}</span>
                <textarea
                  className={footerInput}
                  rows={2}
                  value={footer.brandDesc.ko}
                  onChange={(e) => setFooter((f) => ({ ...f, brandDesc: { ...f.brandDesc, ko: e.target.value } }))}
                  placeholder={t.ctPhBrandIntro}
                />
              </div>
              <div>
                <span className="text-[10px] text-muted block mb-0.5">{t.ctLangZh}</span>
                <textarea
                  className={footerInput}
                  rows={2}
                  value={footer.brandDesc.zh}
                  onChange={(e) => setFooter((f) => ({ ...f, brandDesc: { ...f.brandDesc, zh: e.target.value } }))}
                  placeholder={t.ctPhBrandIntro}
                />
              </div>
            </div>
          </div>

          {/* 版权行（双语） */}
          <div>
            <label className="text-xs tracking-widest text-muted block mb-1">{t.ctCopyright}</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-muted block mb-0.5">{t.ctLangKo}</span>
                <input
                  className={footerInput}
                  value={footer.copyright.ko}
                  onChange={(e) => setFooter((f) => ({ ...f, copyright: { ...f.copyright, ko: e.target.value } }))}
                  placeholder={t.ctPhCopyright}
                />
              </div>
              <div>
                <span className="text-[10px] text-muted block mb-0.5">{t.ctLangZh}</span>
                <input
                  className={footerInput}
                  value={footer.copyright.zh}
                  onChange={(e) => setFooter((f) => ({ ...f, copyright: { ...f.copyright, zh: e.target.value } }))}
                  placeholder={t.ctPhCopyright}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 三栏链接 */}
        <div className="space-y-4">
          <p className="text-xs tracking-widest text-muted">{t.ctLinksSection}</p>
          {footer.columns.map((col, ci) => (
            <div key={ci} className="border border-line p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted w-14 shrink-0">{t.ctColN.replace('{n}', String(ci + 1))}</span>
                <div className="flex-1 min-w-[180px]">
                  <span className="text-[10px] text-muted block mb-0.5">{t.ctColTitleKo}</span>
                  <input
                    className={footerInput}
                    value={col.title.ko}
                    onChange={(e) =>
                      setFooter((f) => {
                        const columns = [...f.columns];
                        columns[ci] = { ...columns[ci], title: { ...columns[ci].title, ko: e.target.value } };
                        return { ...f, columns };
                      })
                    }
                    placeholder={t.ctPhColTitle}
                  />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <span className="text-[10px] text-muted block mb-0.5">{t.ctColTitleZh}</span>
                  <input
                    className={footerInput}
                    value={col.title.zh}
                    onChange={(e) =>
                      setFooter((f) => {
                        const columns = [...f.columns];
                        columns[ci] = { ...columns[ci], title: { ...columns[ci].title, zh: e.target.value } };
                        return { ...f, columns };
                      })
                    }
                    placeholder={t.ctPhColTitle}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFooter((f) => {
                      const columns = [...f.columns];
                      columns[ci] = {
                        ...columns[ci],
                        links: [...columns[ci].links, { label: emptyBi(), href: '' }],
                      };
                      return { ...f, columns };
                    })
                  }
                  className="text-xs px-3 py-1.5 border border-line hover:border-ink whitespace-nowrap self-end mb-0.5"
                >
                  {t.ctAddLink}
                </button>
              </div>
              {col.links.map((l, li) => (
                <div key={li} className="space-y-2 pl-0 sm:pl-14">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <span className="text-[10px] text-muted block mb-0.5">{t.ctTagKo}</span>
                      <input
                        className={footerInput}
                        value={l.label.ko}
                        onChange={(e) =>
                          setFooter((f) => {
                            const columns = [...f.columns];
                            const links = [...columns[ci].links];
                            links[li] = { ...links[li], label: { ...links[li].label, ko: e.target.value } };
                            columns[ci] = { ...columns[ci], links };
                            return { ...f, columns };
                          })
                        }
                        placeholder={t.ctPhTag}
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-muted block mb-0.5">{t.ctTagZh}</span>
                      <input
                        className={footerInput}
                        value={l.label.zh}
                        onChange={(e) =>
                          setFooter((f) => {
                            const columns = [...f.columns];
                            const links = [...columns[ci].links];
                            links[li] = { ...links[li], label: { ...links[li].label, zh: e.target.value } };
                            columns[ci] = { ...columns[ci], links };
                            return { ...f, columns };
                          })
                        }
                        placeholder={t.ctPhTag}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      className={footerInput}
                      value={l.href}
                      onChange={(e) =>
                        setFooter((f) => {
                          const columns = [...f.columns];
                          const links = [...columns[ci].links];
                          links[li] = { ...links[li], href: e.target.value };
                          columns[ci] = { ...columns[ci], links };
                          return { ...f, columns };
                        })
                      }
                      placeholder={t.ctPhUrl}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFooter((f) => {
                          const columns = [...f.columns];
                          const links = columns[ci].links.filter((_, idx) => idx !== li);
                          columns[ci] = { ...columns[ci], links };
                          return { ...f, columns };
                        })
                      }
                      className="text-xs px-2 py-1.5 border border-line hover:border-red-500 text-red-600 shrink-0"
                    >
                      {t.ctDel}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={saveFooter} disabled={footerSaving} className="btn-gold">
            {footerSaving ? t.ctSaving : t.ctSaveFooter}
          </button>
          {footerSaved && <span className="text-xs text-emerald-600">✓ {t.ctSavedRefresh}</span>}
        </div>
      </section>

      {/* 活动管理 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl text-ink">{t.ctEventSection}</h2>
            <p className="text-xs text-muted mt-1">{t.ctEventIntro}</p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setFormKey('new-' + Date.now());
              setShowForm(true);
            }}
            className="btn-gold"
          >
            + {t.ctNewEvent}
          </button>
        </div>

        {loading ? (
          <p className="text-muted text-sm">{t.ctEventLoading}</p>
        ) : (
          <div className="border border-line divide-y divide-line max-w-3xl">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-4 p-4 hover:bg-surface-2">
                <div className="w-16 h-12 bg-surface-2 border border-line overflow-hidden shrink-0">
                  {e.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.imageUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-ink truncate">
                    {e.title}
                    {e.titleZh && <span className="text-muted"> / {e.titleZh}</span>}
                  </p>
                  <p className="text-xs text-muted truncate">
                    #{e.order} · {e.status === 'published' ? t.ctPublished : t.ctDraft}
                    {e.badge && t.ctEventBadge.replace('{b}', e.badge)}
                    {e.href && ` · ${e.href}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditing(e);
                    setFormKey(e.id);
                    setShowForm(true);
                  }}
                  className="text-xs px-3 py-1.5 border border-line hover:border-ink"
                >
                  {t.edit}
                </button>
                <button
                  onClick={() => removeEvent(e.id)}
                  className="text-xs px-3 py-1.5 border border-line hover:border-red-500 text-red-600"
                >
                  {t.delete}
                </button>
              </div>
            ))}
            {events.length === 0 && (
              <p className="p-5 text-sm text-muted">{t.ctEventEmpty}</p>
            )}
          </div>
        )}
      </section>

      {showForm && (
        <EventForm
          key={formKey}
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={(saved) => {
            setShowForm(false);
            setEvents((es) => {
              const exists = es.some((e) => e.id === saved.id);
              return exists ? es.map((e) => (e.id === saved.id ? saved : e)) : [...es, saved];
            });
          }}
        />
      )}
    </div>
  );
}

function EventForm({
  editing,
  onClose,
  onSaved,
}: {
  editing: EventItem | null;
  onClose: () => void;
  onSaved: (e: EventItem) => void;
}) {
  const { dict } = useLocale();
  const t = dict.admin;
  const [form, setForm] = useState({
    title: editing?.title ?? '',
    titleZh: editing?.titleZh ?? '',
    subtitle: editing?.subtitle ?? '',
    subtitleZh: editing?.subtitleZh ?? '',
    badge: editing?.badge ?? '',
    href: editing?.href ?? '',
    imageUrl: editing?.imageUrl ?? '',
    order: editing ? String(editing.order) : '0',
    status: editing?.status ?? 'published',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!form.title.trim()) {
      setErr(t.ctErrEventTitle);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, order: Number(form.order) || 0 };
      const res = editing
        ? await fetch(`/api/admin/events/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        setErr(t.saveFailed);
        return;
      }
      const d = await res.json();
      onSaved(d.event);
    } catch {
      setErr(t.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const label = 'text-xs tracking-widest text-muted block mb-1';
  const input =
    'w-full border border-line bg-surface px-3 py-2 outline-none focus:border-accent transition-colors text-sm';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <form
        onSubmit={submit}
        className="bg-bg w-full max-w-xl my-8 border border-line p-6 space-y-4"
      >
        <div className="flex justify-between items-center">
          <h2 className="font-display text-2xl text-ink">
            {editing ? t.ctEventEdit : t.ctEventNew}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>{t.ctEventTitleKo} *</label>
            <input className={input} value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>
          <div>
            <label className={label}>{t.ctEventTitleZh}</label>
            <input className={input} value={form.titleZh} onChange={(e) => set('titleZh', e.target.value)} />
          </div>
          <div>
            <label className={label}>{t.ctEventSubKo}</label>
            <input className={input} value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
          </div>
          <div>
            <label className={label}>{t.ctEventSubZh}</label>
            <input className={input} value={form.subtitleZh} onChange={(e) => set('subtitleZh', e.target.value)} />
          </div>
          <div>
            <label className={label}>{t.ctEventBadgeLabel}</label>
            <input className={input} value={form.badge} onChange={(e) => set('badge', e.target.value)} />
          </div>
          <div>
            <label className={label}>{t.ctEventLinkLabel}</label>
            <input className={input} value={form.href} onChange={(e) => set('href', e.target.value)} placeholder="/products" />
          </div>
          <div>
            <label className={label}>{t.ctEventOrderLabel}</label>
            <input type="number" className={input} value={form.order} onChange={(e) => set('order', e.target.value)} />
          </div>
          <div>
            <label className={label}>{t.ctStatusLabel}</label>
            <select className={input} value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="published">{t.ctPublished}</option>
              <option value="draft">{t.ctDraft}</option>
            </select>
          </div>
        </div>

        <div>
          <label className={label}>{t.ctEventImageLabel}</label>
          <div className="flex items-center gap-3">
            {form.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.imageUrl} alt="" className="w-20 h-14 object-cover border border-line" />
            )}
            <input
              type="file"
              accept="image/*"
              className="text-xs"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const fd = new FormData();
                fd.append('file', f);
                const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
                if (res.ok) {
                  const d = await res.json();
                  set('imageUrl', d.url);
                } else {
                  setErr(t.uploadFailed);
                }
              }}
            />
          </div>
          <p className="text-[10px] text-muted mt-1">{t.ctEventImageSpec}</p>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-gold">
            {saving ? t.ctSaving : t.save}
          </button>
          <button type="button" onClick={onClose} className="btn-outline">
            {t.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
