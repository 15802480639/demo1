'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import { getDictionary } from '@/i18n/dictionaries';

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

/** 固定页面正文：slug 对应前台 /info/<slug>，正文存 SiteSetting 键 info.<slug>.<locale> */
const INFO_PAGE_DEFS: { slug: string; label: string }[] = [
  { slug: 'shipping', label: '配送政策（/info/shipping）' },
  { slug: 'returns', label: '退换货政策（/info/returns）' },
  { slug: 'contact', label: '联系我们（/info/contact）' },
  { slug: 'privacy', label: '隐私政策（/info/privacy）' },
  { slug: 'terms', label: '服务条款（/info/terms）' },
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
  useLocale(); // 后台固定中文
  const t = getDictionary('zh').admin;
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
        <h1 className="font-display text-3xl text-ink">页面内容</h1>
        <p className="text-xs text-muted mt-1">
          这里管理前台页面上直接展示的文案和活动内容，改完刷新前台即可看到。
        </p>
      </div>

      {/* 首页介绍文案 */}
      <section className="border border-line bg-surface p-5 space-y-4 max-w-2xl">
        <div>
          <h2 className="font-display text-xl text-ink">首页介绍文案</h2>
          <p className="text-xs text-muted mt-1">
            首页中部「高端高尔夫服饰商城」那一段文字。三种语言可分别填写；某语言留空则显示该语言默认文案。
          </p>
        </div>
        <div>
          <label className="text-xs tracking-widest text-muted block mb-1">标题</label>
          <div className="space-y-2">
            <input
              className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              value={homeSeo.heading.ko}
              onChange={(e) => setHomeSeo((s) => ({ ...s, heading: { ...s.heading, ko: e.target.value } }))}
              placeholder="韩语标题（留空用默认）"
            />
            <input
              className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              value={homeSeo.heading.zh}
              onChange={(e) => setHomeSeo((s) => ({ ...s, heading: { ...s.heading, zh: e.target.value } }))}
              placeholder="中文标题（留空用默认）"
            />
            <input
              className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              value={homeSeo.heading.en}
              onChange={(e) => setHomeSeo((s) => ({ ...s, heading: { ...s.heading, en: e.target.value } }))}
              placeholder="英语标题（留空用默认）"
            />
          </div>
        </div>
        <div>
          <label className="text-xs tracking-widest text-muted block mb-1">正文</label>
          <div className="space-y-2">
            <textarea
              className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              rows={2}
              value={homeSeo.body.ko}
              onChange={(e) => setHomeSeo((s) => ({ ...s, body: { ...s.body, ko: e.target.value } }))}
              placeholder="韩语正文（留空用默认）"
            />
            <textarea
              className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              rows={2}
              value={homeSeo.body.zh}
              onChange={(e) => setHomeSeo((s) => ({ ...s, body: { ...s.body, zh: e.target.value } }))}
              placeholder="中文正文（留空用默认）"
            />
            <textarea
              className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              rows={2}
              value={homeSeo.body.en}
              onChange={(e) => setHomeSeo((s) => ({ ...s, body: { ...s.body, en: e.target.value } }))}
              placeholder="英语正文（留空用默认）"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveHomeSeo} disabled={homeSeoSaving} className="btn-gold">
            {homeSeoSaving ? '保存中…' : '保存介绍文案'}
          </button>
          {homeSeoSaved && <span className="text-xs text-emerald-600">✓ 已保存</span>}
        </div>
      </section>

      {/* 固定页面正文（隐私政策 / 服务条款等） */}
      <section className="border border-line bg-surface p-5 space-y-5 max-w-3xl">
        <div>
          <h2 className="font-display text-xl text-ink">页面正文（条款与政策）</h2>
          <p className="text-xs text-muted mt-1">
            页脚「客户服务」「条款与政策」点进去的页面内容都在这里填。
            每个页面<b>分韩文 / 中文 / 英文三套</b>，<b>空行即分段</b>；
            哪套不填，前台就显示默认占位文案。保存后前台刷新即生效。
          </p>
        </div>

        <div className="space-y-6">
          {INFO_PAGE_DEFS.map((def) => {
            const v = infoPages[def.slug] ?? { ko: '', zh: '', en: '' };
            const set = (loc: 'ko' | 'zh' | 'en', val: string) =>
              setInfoPages((s) => ({ ...s, [def.slug]: { ...v, [loc]: val } }));
            const name = def.label.split('（')[0];
            const langLabel = (loc: 'ko' | 'zh' | 'en') =>
              loc === 'ko' ? '韩文' : loc === 'zh' ? '中文' : '英文';
            return (
              <div key={def.slug} className="border border-line p-4 space-y-2">
                <div className="text-sm font-medium text-ink">{def.label}</div>
                {(['ko', 'zh', 'en'] as const).map((loc) => (
                  <div key={loc}>
                    <span className="text-[10px] text-muted block mb-0.5">{langLabel(loc)}</span>
                    <textarea
                      className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
                      rows={8}
                      value={v[loc]}
                      onChange={(e) => set(loc, e.target.value)}
                      placeholder={`${name} · ${langLabel(loc)}正文（留空显示默认）`}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={saveInfoPages} disabled={infoSaving} className="btn-gold">
            {infoSaving ? '保存中…' : '保存页面正文'}
          </button>
          {infoSaved && <span className="text-xs text-emerald-600">✓ 已保存</span>}
        </div>
      </section>

      {/* 页脚管理 */}
      <section className="border border-line bg-surface p-5 space-y-5 max-w-3xl">
        <div>
          <h2 className="font-display text-xl text-ink">页脚管理</h2>
          <p className="text-xs text-muted mt-1">
            网站最底部黑色区域的全部内容都在这里改。文字项<b>分韩文 / 中文两套填写</b>，
            哪套留空就用哪套的默认值；链接地址（URL）不分语言填一套即可。
          </p>
        </div>

        <div className="space-y-4">
          {/* 品牌名（双语） */}
          <div>
            <label className="text-xs tracking-widest text-muted block mb-1">品牌名</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-muted block mb-0.5">韩文</span>
                <input
                  className={footerInput}
                  value={footer.brandName.ko}
                  onChange={(e) => setFooter((f) => ({ ...f, brandName: { ...f.brandName, ko: e.target.value } }))}
                  placeholder="기본값: J&D"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted block mb-0.5">中文</span>
                <input
                  className={footerInput}
                  value={footer.brandName.zh}
                  onChange={(e) => setFooter((f) => ({ ...f, brandName: { ...f.brandName, zh: e.target.value } }))}
                  placeholder="默认：J&D"
                />
              </div>
            </div>
          </div>

          {/* YouTube / Instagram（URL 单套） */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">YouTube 链接</label>
              <input
                className={footerInput}
                value={footer.youtube}
                onChange={(e) => setFooter((f) => ({ ...f, youtube: e.target.value }))}
                placeholder="默认读取站点配置"
              />
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">Instagram 链接</label>
              <input
                className={footerInput}
                value={footer.instagram}
                onChange={(e) => setFooter((f) => ({ ...f, instagram: e.target.value }))}
                placeholder="默认读取站点配置"
              />
            </div>
          </div>

          {/* 联系信息行（双语） */}
          <div>
            <label className="text-xs tracking-widest text-muted block mb-1">联系信息行</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-muted block mb-0.5">韩文</span>
                <input
                  className={footerInput}
                  value={footer.contactLine.ko}
                  onChange={(e) => setFooter((f) => ({ ...f, contactLine: { ...f.contactLine, ko: e.target.value } }))}
                  placeholder="기본값: cs@jand.golf · 전화"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted block mb-0.5">中文</span>
                <input
                  className={footerInput}
                  value={footer.contactLine.zh}
                  onChange={(e) => setFooter((f) => ({ ...f, contactLine: { ...f.contactLine, zh: e.target.value } }))}
                  placeholder="默认：cs@jand.golf · 电话"
                />
              </div>
            </div>
          </div>

          {/* 品牌简介（双语） */}
          <div>
            <label className="text-xs tracking-widest text-muted block mb-1">品牌简介</label>
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-muted block mb-0.5">韩文</span>
                <textarea
                  className={footerInput}
                  rows={2}
                  value={footer.brandDesc.ko}
                  onChange={(e) => setFooter((f) => ({ ...f, brandDesc: { ...f.brandDesc, ko: e.target.value } }))}
                  placeholder="기본값: J&D은 합리적인 가격으로 남녀 골프 의류…"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted block mb-0.5">中文</span>
                <textarea
                  className={footerInput}
                  rows={2}
                  value={footer.brandDesc.zh}
                  onChange={(e) => setFooter((f) => ({ ...f, brandDesc: { ...f.brandDesc, zh: e.target.value } }))}
                  placeholder="默认：J&D 以合理的价格提供男女高尔夫服饰、外套、针织、帽子、包袋等高级高尔夫时尚…"
                />
              </div>
            </div>
          </div>

          {/* 版权行（双语） */}
          <div>
            <label className="text-xs tracking-widest text-muted block mb-1">版权行</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-muted block mb-0.5">韩文</span>
                <input
                  className={footerInput}
                  value={footer.copyright.ko}
                  onChange={(e) => setFooter((f) => ({ ...f, copyright: { ...f.copyright, ko: e.target.value } }))}
                  placeholder="기본값: 저작권 J&D — 2026 J&D"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted block mb-0.5">中文</span>
                <input
                  className={footerInput}
                  value={footer.copyright.zh}
                  onChange={(e) => setFooter((f) => ({ ...f, copyright: { ...f.copyright, zh: e.target.value } }))}
                  placeholder="默认：版权所有 J&D — 2026 J&D — 保留所有权利"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 三栏链接 */}
        <div className="space-y-4">
          <p className="text-xs tracking-widest text-muted">链接栏目（默认三栏，标题与标签均分韩/中填写，留空用默认）</p>
          {footer.columns.map((col, ci) => (
            <div key={ci} className="border border-line p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted w-14 shrink-0">第 {ci + 1} 栏</span>
                <div className="flex-1 min-w-[180px]">
                  <span className="text-[10px] text-muted block mb-0.5">栏目标题 · 韩文</span>
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
                    placeholder="기본값: 브랜드 소개"
                  />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <span className="text-[10px] text-muted block mb-0.5">栏目标题 · 中文</span>
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
                    placeholder="默认：关于品牌"
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
                  + 链接
                </button>
              </div>
              {col.links.map((l, li) => (
                <div key={li} className="space-y-2 pl-0 sm:pl-14">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <span className="text-[10px] text-muted block mb-0.5">标签 · 韩文</span>
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
                        placeholder="예: 브랜드"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-muted block mb-0.5">标签 · 中文</span>
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
                        placeholder="例：品牌"
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
                      placeholder="地址（不分语言），如 /brands"
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
                      删
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={saveFooter} disabled={footerSaving} className="btn-gold">
            {footerSaving ? '保存中…' : '保存页脚'}
          </button>
          {footerSaved && <span className="text-xs text-emerald-600">✓ 已保存，刷新前台即可看到</span>}
        </div>
      </section>

      {/* 活动管理 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl text-ink">活动页面</h2>
            <p className="text-xs text-muted mt-1">
              「活动」页面的内容在这里维护，支持韩语 + 中文双语、配图和跳转链接。
            </p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setFormKey('new-' + Date.now());
              setShowForm(true);
            }}
            className="btn-gold"
          >
            + 新建活动
          </button>
        </div>

        {loading ? (
          <p className="text-muted text-sm">加载中…</p>
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
                    #{e.order} · {e.status === 'published' ? '已上架' : '草稿'}
                    {e.badge && ` · 角标 ${e.badge}`}
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
                  编辑
                </button>
                <button
                  onClick={() => removeEvent(e.id)}
                  className="text-xs px-3 py-1.5 border border-line hover:border-red-500 text-red-600"
                >
                  删除
                </button>
              </div>
            ))}
            {events.length === 0 && (
              <p className="p-5 text-sm text-muted">
                还没有活动内容 — 前台「活动」页显示默认文案。点「新建活动」添加第一条。
              </p>
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
  const t = getDictionary('zh').admin;
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
      setErr('请填写活动标题（韩语）');
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
            {editing ? '编辑活动' : '新建活动'}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>标题（韩语）*</label>
            <input className={input} value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>
          <div>
            <label className={label}>标题（中文）</label>
            <input className={input} value={form.titleZh} onChange={(e) => set('titleZh', e.target.value)} />
          </div>
          <div>
            <label className={label}>副标题（韩语）</label>
            <input className={input} value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
          </div>
          <div>
            <label className={label}>副标题（中文）</label>
            <input className={input} value={form.subtitleZh} onChange={(e) => set('subtitleZh', e.target.value)} />
          </div>
          <div>
            <label className={label}>角标（如 LIVE / NEW）</label>
            <input className={input} value={form.badge} onChange={(e) => set('badge', e.target.value)} />
          </div>
          <div>
            <label className={label}>跳转链接（可选）</label>
            <input className={input} value={form.href} onChange={(e) => set('href', e.target.value)} placeholder="/products" />
          </div>
          <div>
            <label className={label}>排序（小的在前）</label>
            <input type="number" className={input} value={form.order} onChange={(e) => set('order', e.target.value)} />
          </div>
          <div>
            <label className={label}>状态</label>
            <select className={input} value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="published">已上架</option>
              <option value="draft">草稿</option>
            </select>
          </div>
        </div>

        <div>
          <label className={label}>配图（可选）</label>
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
          <p className="text-[10px] text-muted mt-1">
            建议尺寸 1200×630（横图，活动卡片顶部展示）；单张 ≤10MB
          </p>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-gold">
            {saving ? '保存中…' : t.save}
          </button>
          <button type="button" onClick={onClose} className="btn-outline">
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
