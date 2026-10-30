'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';

/**
 * SEO 设置页。
 * 🔴 铁律：这里列出的每一个字段都必须真实驱动前台输出，
 *否则就是「填了没生效」的假设置（上一版 8 个字段前台零引用）。
 * 对应前台消费方见 src/lib/seo.ts 的 siteMetaDefaults / metaVerificationTags /
 * siteOgImage / siteGaId / organizationJsonLd。
 */
const META_KEYS = [
  'meta_title',
  'meta_description',
  'meta_keywords',
  'og_image',
  'ga_id',
];

const VERIFY_KEYS = [
  'gsc_verification',
  'bing_verification',
  'naver_verification',
  'baidu_verification',
  'sogou_verification',
];

const COMPANY_KEYS = [
  'company_legal_name',
  'company_ceo',
  'company_address',
  'company_email',
  'company_tel',
  'company_business_no',
];

const SOCIAL_KEYS = [
  'social_youtube',
  'social_instagram',
  'social_kakao',
  'social_facebook',
  'social_x',
  'social_tiktok',
  'social_linkedin',
  'social_links',
];

const INDEXNOW_KEY = 'indexnow_key';

/** 右下角 Kakao 悬浮球开关（2026-10-30 新增，见 src/lib/kakao.ts 的 isKakaoFabEnabled） */
const KAKAO_FAB_KEY = 'kakao_fab_enabled';

/**
 * 双键名映射：库里既存的点号键（seo.gaId 等）与新后台下划线键并存。
 * 读取时合并，让子建在后台看到的是**已有真实值**，而不是一片空白
 * （这正是「填了不生效」被长期没发现的原因）。
 */
const ALIASES: Record<string, string[]> = {
  meta_title: ['seo.homeTitle', 'seo.title'],
  meta_description: ['seo.homeDesc', 'seo.description'],
  meta_keywords: ['seo.keywords'],
  og_image: ['seo.ogImage'],
  ga_id: ['seo.gaId'],
  gsc_verification: ['seo.googleVerify', 'seo.gscVerification'],
  bing_verification: ['seo.bingVerify'],
  indexnow_key: ['indexnow.key'],
};

function merged(s: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...s };
  for (const [primary, alts] of Object.entries(ALIASES)) {
    if (out[primary]?.trim()) continue;
    for (const a of alts) {
      if (typeof s[a] === 'string' && s[a].trim()) {
        out[primary] = s[a];
        break;
      }
    }
  }
  return out;
}

export default function AdminSeoPage() {
  const { dict } = useLocale();
  const t = dict.admin;
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [pushMsg, setPushMsg] = useState('');
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        const s = merged(d.settings ?? {});
        const init: Record<string, string> = {};
        for (const k of [
          ...META_KEYS,
          ...VERIFY_KEYS,
          ...COMPANY_KEYS,
          ...SOCIAL_KEYS,
          INDEXNOW_KEY,
          KAKAO_FAB_KEY,
        ]) {
          init[k] = s[k] ?? '';
        }
        setForm(init);
      })
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    setMsg('');
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: form }),
    });
    setMsg(res.ok ? '✓' : t.saveFailed);
    setSaving(false);
  }

  async function pushAll() {
    setPushing(true);
    setPushMsg('');
    try {
      const res = await fetch('/api/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true, key: form[INDEXNOW_KEY] || undefined }),
      });
      const d = await res.json();
      setPushMsg(
        d.ok
          ? t.spSubmitted
              .replace('{a}', String(d.submitted))
              .replace('{b}', String(d.totalCollected ?? d.submitted))
          : `⚠ ${d.error ?? `HTTP ${d.status ?? '?'}`}`
      );
    } catch (e) {
      setPushMsg(`⚠ ${e instanceof Error ? e.message : 'failed'}`);
    } finally {
      setPushing(false);
    }
  }

  const input =
    'w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent';
  const label = 'text-xs tracking-widest text-muted block mb-1';
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
    <div className="border border-line bg-surface p-6 space-y-4">
      <div>
        <h2 className="font-display text-lg text-ink">{title}</h2>
        {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl text-ink">{t.seo}</h1>
      <p className="text-sm text-muted mt-1">{t.seoIntro}</p>

      <div className="space-y-6 mt-6">
        <Section
          title={t.geoFactTitle}
          hint={t.spSaveHint}
        >
          <div>
            <label className={label}>{t.metaTitle}</label>
            <input
              className={input}
              value={form.meta_title ?? ''}
              onChange={(e) => set('meta_title', e.target.value)}
              placeholder="J&D — Premium Golfwear"
            />
          </div>
          <div>
            <label className={label}>{t.metaDescription}</label>
            <textarea
              className={`${input} min-h-[80px]`}
              value={form.meta_description ?? ''}
              onChange={(e) => set('meta_description', e.target.value)}
            />
          </div>
          <div>
            <label className={label}>{t.metaKeywords}</label>
            <input
              className={input}
              value={form.meta_keywords ?? ''}
              onChange={(e) => set('meta_keywords', e.target.value)}
              placeholder="golfwear, golf apparel, golf jacket"
            />
          </div>
          <div>
            <label className={label}>{t.ogImage}</label>
            <input
              className={input}
              value={form.og_image ?? ''}
              onChange={(e) => set('og_image', e.target.value)}
              placeholder={t.spOgImagePh}
            />
          </div>
          <div>
            <label className={label}>{t.gaId}</label>
            <input
              className={input}
              value={form.ga_id ?? ''}
              onChange={(e) => set('ga_id', e.target.value)}
              placeholder="G-XXXXXXXXXX"
            />
          </div>
        </Section>

        <Section
          title={t.spGscTitle}
          hint={t.spGscHint}
        >
          {VERIFY_KEYS.map((k) => (
            <div key={k}>
              <label className={label}>
                {k === 'gsc_verification'
                  ? t.gscVerification
                  : k === 'bing_verification'
                    ? t.bingVerification
                    : k === 'naver_verification'
                      ? t.naverVerification
                      : k === 'baidu_verification'
                        ? t.baiduVerification
                        : t.sogouVerification}
              </label>
              <input className={input} value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
        </Section>

        <Section
          title={t.companyInfo}
          hint={t.spCompanyHint}
        >
          <div>
            <label className={label}>{t.spCompanyName}</label>
            <input
              className={input}
              value={form.company_legal_name ?? ''}
              onChange={(e) => set('company_legal_name', e.target.value)}
              placeholder="J&D"
            />
          </div>
          <div>
            <label className={label}>{t.spCeo}</label>
            <input
              className={input}
              value={form.company_ceo ?? ''}
              onChange={(e) => set('company_ceo', e.target.value)}
            />
          </div>
          <div>
            <label className={label}>{t.spAddress}</label>
            <input
              className={input}
              value={form.company_address ?? ''}
              onChange={(e) => set('company_address', e.target.value)}
              placeholder="Street, City, Korea"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>{t.spEmail}</label>
              <input
                className={input}
                value={form.company_email ?? ''}
                onChange={(e) => set('company_email', e.target.value)}
                placeholder="cs@jand.golf"
              />
            </div>
            <div>
              <label className={label}>{t.spPhone}</label>
              <input
                className={input}
                value={form.company_tel ?? ''}
                onChange={(e) => set('company_tel', e.target.value)}
                placeholder="+82-2-0000-0000"
              />
            </div>
          </div>
          <div>
            <label className={label}>{t.spBizNo}</label>
            <input
              className={input}
              value={form.company_business_no ?? ''}
              onChange={(e) => set('company_business_no', e.target.value)}
            />
          </div>
        </Section>

        <Section
          title={t.spKakaoTitle}
          hint={t.spKakaoHint}
        >
          <div>
            <label className={label}>{t.spKakaoLabel}</label>
            <input
              className={input}
              value={form.kakao_consult_url ?? ''}
              onChange={(e) => set('kakao_consult_url', e.target.value)}
              placeholder="https://pf.kakao.com/_AbCdEf/chat"
            />
            <p className="mt-1 text-xs text-muted">
              {t.spKakaoStatus}
              {/^https?:\/\//i.test((form.kakao_consult_url ?? '').trim())
                ? t.spKakaoOn
                : t.spKakaoOff}
            </p>
          </div>

          {/* ⚠️ 2026-10-30 新增：右下角 Kakao 悬浮球开关。
              站内实时客服 IM（黑色按钮）上线后，两者定位重合会叠在一起，
              子建拍板「前台只留黑色实时客服」→ 悬浮球默认关闭，后台可随时放回来。
              这个开关只管右下角悬浮球，商品页「Kakao 상담」主按钮不受影响。 */}
          <div className="mt-4 border border-line p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.kakao_fab_enabled === '1'}
                onChange={(e) => set('kakao_fab_enabled', e.target.checked ? '1' : '0')}
                className="w-4 h-4"
              />
              <span className="text-ink font-medium">{t.spKakaoFabLabel}</span>
            </label>
            <p className="text-xs text-muted mt-2">{t.spKakaoFabHint}</p>
          </div>
        </Section>

        <Section
          title={t.socialLinks}
          hint={t.spSameAsHint}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {SOCIAL_KEYS.map((k) => (
              <div key={k}>
                <label className={label}>{k.replace('social_', '')}</label>
                <input
                  className={input}
                  value={form[k] ?? ''}
                  onChange={(e) => set(k, e.target.value)}
                  placeholder="https://…"
                />
              </div>
            ))}
          </div>
        </Section>

        <Section
          title={t.spIndexNowTitle}
          hint={t.spIndexNowHint}
        >
          <div>
            <label className={label}>{t.indexnowKey}</label>
            <input
              className={input}
              value={form[INDEXNOW_KEY] ?? ''}
              onChange={(e) => set(INDEXNOW_KEY, e.target.value)}
              placeholder="a1b2c3d4e5f6"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-gold"
            >
              {saving ? t.saving : t.save}
            </button>
            <button
              type="button"
              onClick={pushAll}
              disabled={pushing}
              className="btn-outline"
            >
              {pushing ? t.geoAuditRunning : t.pushAll}
            </button>
            {msg && <span className="text-xs text-accent">{msg}</span>}
            {pushMsg && <span className="text-xs text-muted">{pushMsg}</span>}
          </div>
        </Section>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button type="button" onClick={save} disabled={saving} className="btn-gold">
          {saving ? t.saving : t.save}
        </button>
        {msg && <span className="text-xs text-accent">{msg}</span>}
      </div>
    </div>
  );
}