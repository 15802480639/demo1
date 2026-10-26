'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';

type Sub = {
  id: string;
  email: string;
  locale: string;
  status: string;
  createdAt: string;
};

type Campaign = {
  id: string;
  subject: string;
  kind: string;
  recipients: number;
  sent: number;
  failed: number;
  dryRun: boolean;
  createdAt: string;
};

const LOCALES = [
  { v: 'ko' },
  { v: 'zh' },
  { v: 'en' },
];

export default function AdminNewsletterPage() {
  const { locale, dict } = useLocale();
  const t = dict.admin;
  const [subs, setSubs] = useState<Sub[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [mailLive, setMailLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [kw, setKw] = useState('');

  // ---- 写信 ----
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [mailLocale, setMailLocale] = useState('ko');
  const [testTo, setTestTo] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/admin/newsletter');
    if (r.ok) {
      const d = await r.json();
      setSubs(d.subs ?? []);
      setStats({ total: d.total ?? 0, active: d.active ?? 0 });
      setCampaigns(d.campaigns ?? []);
      setMailLive(d.mailLive !== false);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    if (!confirm(t.deleteConfirm)) return;
    await fetch(`/api/admin/newsletter?id=${id}`, { method: 'DELETE' });
    load();
  }

  async function send(isTest: boolean) {
    if (!subject.trim()) return setMsg({ kind: 'err', text: t.nlSubjectRequired });
    if (!body.trim()) return setMsg({ kind: 'err', text: t.nlBodyRequired });
    if (isTest && !testTo.trim()) return setMsg({ kind: 'err', text: t.nlTestToRequired });

    // 正式群发必须二次确认 —— 发错无法撤回
    if (!isTest) {
      const n = stats.active;
      if (n <= 0) return setMsg({ kind: 'err', text: t.nlNoSubs });
      if (!confirm(t.nlConfirmSend.replace('{n}', String(n)))) return;
    }

    setSending(true);
    setMsg(null);
    try {
      const r = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          locale: mailLocale,
          ...(isTest ? { testTo: testTo.trim().toLowerCase() } : {}),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        const map: Record<string, string> = {
          NO_SUBJECT: t.nlErrNoSubject,
          NO_BODY: t.nlErrNoBody,
          INVALID_TEST_EMAIL: t.nlErrInvalidTest,
          NO_ACTIVE_SUBS: t.nlErrNoActive,
          UNAUTHENTICATED: t.nlErrExpired,
          FORBIDDEN: t.nlErrForbidden,
        };
        setMsg({ kind: 'err', text: t.nlErrSend.replace('{e}', map[d.error] || String(d.error || r.status)) });
      } else {
        const prefix = d.dryRun ? t.nlDryRunPrefix : '';
        const head = isTest ? t.nlTestSent : t.nlDone;
        const stats_ = t.nlSentStats.replace('{s}', String(d.sent)) + (d.failed ? t.nlFailedStats.replace('{f}', String(d.failed)) : '');
        setMsg({ kind: 'ok', text: `${prefix}${head}${stats_}` });
        if (!isTest) {
          setSubject('');
          setBody('');
        }
        load();
      }
    } catch (e) {
      setMsg({ kind: 'err', text: t.nlNetworkErr });
    } finally {
      setSending(false);
    }
  }

  const filtered = subs.filter((s) => s.email.toLowerCase().includes(kw.trim().toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-3xl text-ink">{t.nlTitle}</h1>
        <div className="text-sm text-muted">
          <span dangerouslySetInnerHTML={{ __html: t.nlStats.replace('{t}', String(stats.total)).replace('{a}', String(stats.active)) }} />
        </div>
      </div>

      {/* 未配发信凭据时明确告知，避免以为真发出去了 */}
      {!mailLive && (
        <div className="mb-4 border border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <b>{t.nlDryModeTitle}</b>
          <code className="mx-1">RESEND_API_KEY</code>
          <span dangerouslySetInnerHTML={{ __html: t.nlDryModeBody }} />
        </div>
      )}

      {/* ---- 写信区 ---- */}
      <section className="mb-8 border border-line">
        <h2 className="px-4 py-3 bg-surface-2 border-b border-line text-sm font-semibold text-ink">
          {t.nlCompose}
        </h2>
        <div className="p-4 space-y-3">
          <div className="flex gap-3 items-center">
            <label className="text-xs text-muted w-14 shrink-0">{t.nlLangLabel}</label>
            <select
              className="border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              value={mailLocale}
              onChange={(e) => setMailLocale(e.target.value)}
            >
              {LOCALES.map((l) => (
                <option key={l.v} value={l.v}>
                  {l.v === 'ko' ? t.langNameKo : l.v === 'zh' ? t.langNameZh : t.langNameEn}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">{t.nlLangHint}</span>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">{t.nlSubjectLabel}</label>
            <input
              className="w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t.nlSubjectPh}
              maxLength={120}
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">{t.nlBodyLabel}</label>
            <textarea
              className="w-full border border-line bg-surface px-3 py-2 text-sm leading-relaxed outline-none focus:border-accent"
              rows={7}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t.nlBodyPh}
              maxLength={5000}
            />
            <div className="text-[11px] text-muted mt-1">{body.length} / 5000</div>
          </div>

          {/* 测试发送区 */}
          <div className="flex gap-3 items-end flex-wrap pt-1">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs text-muted mb-1">{t.nlTestLabel}</label>
              <input
                className="w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder={t.nlTestPh}
              />
            </div>
            <button
              onClick={() => send(true)}
              disabled={sending}
              className="px-4 py-2 text-sm border border-ink text-ink hover:bg-ink hover:text-bg transition disabled:opacity-50"
            >
              {sending ? t.nlSending : t.nlSendTest}
            </button>
            <button
              onClick={() => send(false)}
              disabled={sending}
              className="px-4 py-2 text-sm border border-accent text-accent hover:bg-accent hover:text-white transition disabled:opacity-50"
            >
              {sending ? t.nlSending : t.nlSendAll.replace('{n}', String(stats.active))}
            </button>
          </div>

          {msg && (
            <p className={`text-sm pt-1 ${msg.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
              {msg.text}
            </p>
          )}
        </div>
      </section>

      {/* ---- 订阅者列表 ---- */}
      <div className="mb-4">
        <input
          className="w-full max-w-sm border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          placeholder={t.nlSearchPh}
        />
      </div>

      {loading ? (
        <p className="text-muted">{t.nlLoading}</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {filtered.map((s) => (
            <div key={s.id} className="flex items-center gap-4 p-3 hover:bg-surface-2">
              <span className="text-sm text-ink flex-1 truncate">{s.email}</span>
              <span className="text-xs text-muted w-12 text-center uppercase">{s.locale || '—'}</span>
              <span className={`text-xs px-2 py-1 border border-line w-16 text-center ${s.status === 'active' ? 'text-accent' : 'text-muted'}`}>
                {s.status === 'active' ? t.nlActive : t.nlUnsubscribed}
              </span>
              <span className="text-xs text-muted w-28">
                {new Date(s.createdAt).toLocaleDateString(locale === 'ko' ? 'ko-KR' : locale === 'zh' ? 'zh-CN' : 'en-US')}
              </span>
              <button
                onClick={() => remove(s.id)}
                className="text-xs px-3 py-1.5 border border-line hover:border-red-500 text-red-600"
              >
                {t.delete}
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="p-5 text-sm text-muted">
              {subs.length === 0 ? t.nlEmpty : t.nlNoMatch}
            </p>
          )}
        </div>
      )}

      {/* ---- 发信历史 ---- */}
      {campaigns.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-ink mb-2">{t.nlHistory}</h2>
          <div className="border border-line divide-y divide-line">
            {campaigns.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 text-xs">
                <span className="text-muted w-28 shrink-0">
                  {new Date(c.createdAt).toLocaleString(locale === 'ko' ? 'ko-KR' : locale === 'zh' ? 'zh-CN' : 'en-US', { hour12: false })}
                </span>
                <span className="text-ink flex-1 truncate">{c.subject}</span>
                <span className={`px-2 py-0.5 border ${c.kind === 'test' ? 'border-line text-muted' : 'border-line text-ink'}`}>
                  {c.kind === 'test' ? t.nlKindTest : t.nlKindAll}
                </span>
                <span className="text-muted w-24 text-right">
                  {c.kind === 'test'
                    ? c.sent
                      ? t.nlTestOk
                      : t.nlTestFail
                    : t.nlStatsOk.replace('{s}', String(c.sent)).replace('{r}', String(c.recipients))}
                </span>
                {c.dryRun && <span className="px-2 py-0.5 border border-amber-500 text-amber-700">{t.nlDryTag}</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}