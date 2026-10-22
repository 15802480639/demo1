'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import { getDictionary } from '@/i18n/dictionaries';
import GeoFactEditor from '@/components/admin/geo-fact-editor';
import type { Locale } from '@/i18n/config';

type Faq = {
  id: string;
  scope: string;
  target: string;
  question: string;
  answer: string;
  locale: string;
  order: number;
  status: string;
};

const EMPTY = {
  question: '',
  answer: '',
  locale: 'zh',
  scope: 'global',
  target: '',
  order: 0,
  status: 'published',
};

export default function GeoKnowledgeBase({
  loc,
  stats,
}: {
  loc: Locale;
  stats: { faqCount: number; productCount: number; categoryCount: number };
}) {
  useLocale(); // 后台固定中文
  const t = getDictionary('zh').admin;

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  const [intro, setIntro] = useState({ en: '', zh: '', ko: '' });
  const [introSaving, setIntroSaving] = useState(false);
  const [introMsg, setIntroMsg] = useState('');

  async function loadFaqs() {
    setLoading(true);
    const res = await fetch('/api/admin/faqs');
    const data = await res.json();
    setFaqs(data.faqs ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadFaqs();
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        const s = d.settings ?? {};
        // 兼容存量点号键名（llms.intro.zh），避免后台显示为空白
        setIntro({
          en: s.llms_intro_en || s['llms.intro.en'] || s['llms.intro'] || '',
          zh: s.llms_intro_zh || s['llms.intro.zh'] || '',
          ko: s.llms_intro_ko || s['llms.intro.ko'] || '',
        });
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return faqs;
    const k = q.trim().toLowerCase();
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(k) || f.answer.toLowerCase().includes(k)
    );
  }, [faqs, q]);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, locale: loc });
    setErr('');
  }

  function openEdit(f: Faq) {
    setEditing(f);
    setForm({
      question: f.question,
      answer: f.answer,
      locale: f.locale,
      scope: f.scope,
      target: f.target,
      order: f.order,
      status: f.status,
    });
    setErr('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    const res = await fetch('/api/admin/faqs', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
    });
    if (!res.ok) {
      setErr(t.saveFailed);
    } else {
      loadFaqs();
      openNew();
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm(t.deleteConfirm)) return;
    await fetch(`/api/admin/faqs?id=${id}`, { method: 'DELETE' });
    loadFaqs();
  }

  async function saveIntro() {
    setIntroSaving(true);
    setIntroMsg('');
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: {
          llms_intro_en: intro.en,
          llms_intro_zh: intro.zh,
          llms_intro_ko: intro.ko,
        },
      }),
    });
    setIntroMsg(res.ok ? '✓' : t.saveFailed);
    setIntroSaving(false);
  }

  const input =
    'w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent';
  const label = 'text-xs tracking-widest text-muted block mb-1';

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">{t.geo}</h1>
      <p className="text-sm text-muted mt-1 max-w-3xl">{t.geoIntro}</p>

      {/* ── 健康度 ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
        <div className="border border-line bg-surface p-4">
          <div className="text-xs tracking-wide text-muted">{t.geoFaqCount}</div>
          <div className="font-display text-3xl text-ink mt-1">{stats.faqCount}</div>
        </div>
        <div className="border border-line bg-surface p-4">
          <div className="text-xs tracking-wide text-muted">{t.geoProductCount}</div>
          <div className="font-display text-3xl text-ink mt-1">
            {stats.productCount}
            <span className="text-base text-muted"> / {stats.categoryCount}</span>
          </div>
        </div>
        <div className="border border-line bg-surface p-4">
          <div className="text-xs tracking-wide text-muted">llms.txt</div>
          <a
            href="/llms.txt"
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-sm text-accent hover:underline"
          >
            {t.viewVerify} →
          </a>
        </div>
        <div className="border border-line bg-surface p-4">
          <div className="text-xs tracking-wide text-muted">{t.geoLinks}</div>
          <div className="mt-1 flex flex-col gap-0.5 text-xs">
            <a
              href="/llms.txt"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              llms.txt
            </a>
            <a
              href="/llms-full.txt"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              llms-full.txt
            </a>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              sitemap.xml
            </a>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              robots.txt
            </a>
            <a
              href={`/${loc}/faq`}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              常见问题
            </a>
            <a
              href={`/${loc}/admin/geo-audit`}
              className="text-accent hover:underline font-medium"
            >
              → {t.geoAudit}
            </a>
          </div>
        </div>
      </div>

      {/* ── llms.txt 导语 ── */}
      <section className="border border-line bg-surface p-6 mt-8 max-w-3xl">
        <h2 className="font-display text-xl text-ink">{t.llmsIntro}</h2>
        <p className="text-sm text-muted mt-1">{t.llmsIntroHint}</p>
        <div className="space-y-3 mt-4">
          <div>
            <label className={label}>{t.llmsIntroZh}</label>
            <textarea
              className={`${input} min-h-[90px]`}
              value={intro.zh}
              onChange={(e) => setIntro({ ...intro, zh: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>{t.llmsIntroEn}</label>
            <textarea
              className={`${input} min-h-[90px]`}
              value={intro.en}
              onChange={(e) => setIntro({ ...intro, en: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>한국어</label>
            <textarea
              className={`${input} min-h-[90px]`}
              value={intro.ko}
              onChange={(e) => setIntro({ ...intro, ko: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={saveIntro}
            disabled={introSaving}
            className="btn-gold"
          >
            {introSaving ? t.saving : t.saveIntro}
          </button>
          {introMsg && <span className="text-xs text-accent">{introMsg}</span>}
        </div>
      </section>

      {/* ── FAQ 管理 ── */}
      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">{t.faqTitle}</h2>
        <p className="text-sm text-muted mt-1 max-w-3xl">{t.faqHint}</p>

        <form
          onSubmit={save}
          className="border border-line bg-surface p-6 mt-4 max-w-3xl space-y-4"
        >
          <h3 className="font-semibold text-ink text-sm">
            {editing ? t.editFaq : t.newFaq}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>{t.question} *</label>
              <textarea
                className={`${input} min-h-[60px]`}
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>{t.answer} *</label>
              <textarea
                className={`${input} min-h-[120px]`}
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                required
              />
            </div>
            <div>
              <label className={label}>{t.language}</label>
              <select
                className={input}
                value={form.locale}
                onChange={(e) => setForm({ ...form, locale: e.target.value })}
              >
                <option value="">{t.allLocales}</option>
                <option value="ko">한국어</option>
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className={label}>{t.scope}</label>
              <select
                className={input}
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })}
              >
                <option value="global">{t.scopeGlobal}</option>
                <option value="product">{t.scopeProduct}</option>
              </select>
            </div>
            {form.scope === 'product' && (
              <div>
                <label className={label}>{t.targetSlug}</label>
                <input
                  className={input}
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                  placeholder="mk-26padded-jacket-khaki"
                />
              </div>
            )}
            <div>
              <label className={label}>{t.order}</label>
              <input
                type="number"
                className={input}
                value={form.order}
                onChange={(e) =>
                  setForm({ ...form, order: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label className={label}>{t.status}</label>
              <select
                className={input}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="published">{t.published}</option>
                <option value="draft">{t.draft}</option>
              </select>
            </div>
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-gold">
              {saving ? t.saving : t.save}
            </button>
            {editing && (
              <button type="button" onClick={openNew} className="btn-outline">
                {t.cancel}
              </button>
            )}
          </div>
        </form>

        {/* 列表 */}
        <div className="max-w-3xl mt-6">
          <input
            className={`${input} max-w-xs`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`${t.search}…`}
          />

          <div className="border border-line divide-y divide-line mt-3">
            {loading ? (
              <p className="p-5 text-sm text-muted">加载中…</p>
            ) : filtered.length === 0 ? (
              <p className="p-5 text-sm text-muted">{t.noFaqs}</p>
            ) : (
              filtered.map((f) => (
                <div key={f.id} className="p-4 space-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-ink font-medium">{f.question}</p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openEdit(f)}
                        className="text-xs px-3 py-1.5 border border-line hover:border-accent text-accent"
                      >
                        {t.edit}
                      </button>
                      <button
                        onClick={() => remove(f.id)}
                        className="text-xs px-3 py-1.5 border border-line hover:border-red-500 text-red-600"
                      >
                        {t.delete}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted whitespace-pre-wrap">{f.answer}</p>
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 border border-line text-muted">
                      {f.locale ? f.locale.toUpperCase() : t.allLocales}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 border border-line text-muted">
                      {f.scope === 'product'
                        ? `${t.scopeProduct}: ${f.target}`
                        : t.scopeGlobal}
                    </span>
                    {f.status === 'draft' && (
                      <span className="text-[10px] px-1.5 py-0.5 border border-line text-muted">
                        {t.draft}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── 实体档案（GeoFact） ── */}
      <GeoFactEditor loc={loc} />
    </div>
  );
}