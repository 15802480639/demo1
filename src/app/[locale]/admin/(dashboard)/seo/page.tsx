'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import { getDictionary } from '@/i18n/dictionaries';

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
  useLocale(); // 后台固定中文
  const t = getDictionary('zh').admin;
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
          ? `✓ ${d.submitted}/${d.totalCollected ?? d.submitted} 已提交`
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
          hint="保存即生效，无需重新 build。留空则回落系统默认。"
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
              placeholder="https://…（建议 1200×630）"
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
          title="Search Console 验证"
          hint="保存后立刻输出到所有页面的 head。⚠️ GSC 必须选「HTML 标记」验证方式，本站有动态路由不适合「HTML 文件」方式。"
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
          hint="⚠️ 强烈建议填满：公司法定名称与地址是 AI 做品牌实体消歧的硬证据。留'—'或占位符时前台会自动剔除，绝不会输出脏数据污染实体。"
        >
          <div>
            <label className={label}>公司法定名称</label>
            <input
              className={input}
              value={form.company_legal_name ?? ''}
              onChange={(e) => set('company_legal_name', e.target.value)}
              placeholder="J&D"
            />
          </div>
          <div>
            <label className={label}>CEO / 代表</label>
            <input
              className={input}
              value={form.company_ceo ?? ''}
              onChange={(e) => set('company_ceo', e.target.value)}
            />
          </div>
          <div>
            <label className={label}>公司地址</label>
            <input
              className={input}
              value={form.company_address ?? ''}
              onChange={(e) => set('company_address', e.target.value)}
              placeholder="Street, City, Korea"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>联系邮箱</label>
              <input
                className={input}
                value={form.company_email ?? ''}
                onChange={(e) => set('company_email', e.target.value)}
                placeholder="cs@jand.golf"
              />
            </div>
            <div>
              <label className={label}>联系电话</label>
              <input
                className={input}
                value={form.company_tel ?? ''}
                onChange={(e) => set('company_tel', e.target.value)}
                placeholder="+82-2-0000-0000"
              />
            </div>
          </div>
          <div>
            <label className={label}>营业执照 / 法人登记号</label>
            <input
              className={input}
              value={form.company_business_no ?? ''}
              onChange={(e) => set('company_business_no', e.target.value)}
            />
          </div>
        </Section>

        <Section
          title="Kakao 咨询链接（购买通道）"
          hint="客户在 Kakao 平台创建频道后，把聊天页地址粘到这里，形如 https://pf.kakao.com/_AbCdEf/chat 。填了之后韩语商品页的主按钮会从「加入购物车」变成「Kakao 상담」，点它会先在本站留一条咨询记录（商品名/规格/价格/语言），再跳转 Kakao。留空 = 保持原购物车按钮不变。"
        >
          <div>
            <label className={label}>Kakao 频道聊天链接</label>
            <input
              className={input}
              value={form.kakao_consult_url ?? ''}
              onChange={(e) => set('kakao_consult_url', e.target.value)}
              placeholder="https://pf.kakao.com/_AbCdEf/chat"
            />
            <p className="mt-1 text-xs text-muted">
              当前状态：
              {/^https?:\/\//i.test((form.kakao_consult_url ?? '').trim())
                ? '已启用 —— 韩语商品页主按钮为「Kakao 상담」'
                : '未配置 —— 保持「加入购物车 / 立即购买」'}
            </p>
          </div>
        </Section>

        <Section
          title={t.socialLinks}
          hint="官方账号链接，会输出为 Organization JSON-LD 的 sameAs 字段 —— 这是把品牌与第三方账号绑定的唯一硬证据。⚠️ 只填 http(s) 开头的真实地址，填 '#' 会被自动剔除。至少填 2 个。"
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
          title="IndexNow（即时收录）"
          hint="ChatGPT 联网检索主要走 Bing 索引，IndexNow 推送后 Bing 系几分钟内重抓。填 8~128 位字母/数字/连字符作为密钥，另需把同内容文件放到 public/{key}.txt 保证公网可读。"
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