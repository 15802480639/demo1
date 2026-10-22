'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import { getDictionary } from '@/i18n/dictionaries';

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
  { v: 'ko', label: '한국어' },
  { v: 'zh', label: '中文' },
  { v: 'en', label: 'English' },
];

export default function AdminNewsletterPage() {
  const { locale } = useLocale();
  const t = getDictionary('zh').admin;
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
    if (!subject.trim()) return setMsg({ kind: 'err', text: '请填写邮件主题' });
    if (!body.trim()) return setMsg({ kind: 'err', text: '请填写邮件正文' });
    if (isTest && !testTo.trim()) return setMsg({ kind: 'err', text: '请填写测试收件邮箱' });

    // 正式群发必须二次确认 —— 发错无法撤回
    if (!isTest) {
      const n = stats.active;
      if (n <= 0) return setMsg({ kind: 'err', text: '当前没有有效订阅者，无法群发' });
      if (!confirm(`即将向 ${n} 位有效订阅者群发本邮件。\n\n发送后无法撤回，确定继续吗？`)) return;
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
          NO_SUBJECT: '缺少主题',
          NO_BODY: '缺少正文',
          INVALID_TEST_EMAIL: '测试邮箱格式不对',
          NO_ACTIVE_SUBS: '没有有效订阅者',
          UNAUTHENTICATED: '登录已过期，请重新登录',
          FORBIDDEN: '无权限',
        };
        setMsg({ kind: 'err', text: map[d.error] || `发送失败：${d.error || r.status}` });
      } else {
        const prefix = d.dryRun ? '【演练模式，未真实发送】' : '';
        setMsg({
          kind: 'ok',
          text: `${prefix}${isTest ? '测试邮件已发送' : '群发完成'}：成功 ${d.sent} 封${d.failed ? `，失败 ${d.failed} 封` : ''}`,
        });
        if (!isTest) {
          setSubject('');
          setBody('');
        }
        load();
      }
    } catch (e) {
      setMsg({ kind: 'err', text: '网络异常，请重试' });
    } finally {
      setSending(false);
    }
  }

  const filtered = subs.filter((s) => s.email.toLowerCase().includes(kw.trim().toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-3xl text-ink">订阅列表</h1>
        <div className="text-sm text-muted">
          共 <b className="text-ink">{stats.total}</b> 人订阅 · 有效 <b className="text-ink">{stats.active}</b> 人
        </div>
      </div>

      {/* 未配发信凭据时明确告知，避免以为真发出去了 */}
      {!mailLive && (
        <div className="mb-4 border border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <b>当前为演练模式</b>：服务器尚未配置 <code className="mx-1">RESEND_API_KEY</code>，
          点击发送只会把邮件内容写进日志而<b>不会真实投递</b>。
          模板、退订、统计均可正常验证；填入 key 并重启后即自动切换为真实发送。
        </div>
      )}

      {/* ---- 写信区 ---- */}
      <section className="mb-8 border border-line">
        <h2 className="px-4 py-3 bg-surface-2 border-b border-line text-sm font-semibold text-ink">
          写电子报
        </h2>
        <div className="p-4 space-y-3">
          <div className="flex gap-3 items-center">
            <label className="text-xs text-muted w-14 shrink-0">邮件语种</label>
            <select
              className="border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              value={mailLocale}
              onChange={(e) => setMailLocale(e.target.value)}
            >
              {LOCALES.map((l) => (
                <option key={l.v} value={l.v}>{l.label}</option>
              ))}
            </select>
            <span className="text-xs text-muted">
              （底部退订文案随之变化；正文内容请自行使用对应语种）
            </span>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">主题</label>
            <input
              className="w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="例：J&D 冬季新品上市 / 全新collection 공개"
              maxLength={120}
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">正文（空行分段）</label>
            <textarea
              className="w-full border border-line bg-surface px-3 py-2 text-sm leading-relaxed outline-none focus:border-accent"
              rows={7}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={'第一段：开场白\n\n第二段：新品介绍\n\n第三段：引导回网站选购'}
              maxLength={5000}
            />
            <div className="text-[11px] text-muted mt-1">{body.length} / 5000</div>
          </div>

          {/* 测试发送区 */}
          <div className="flex gap-3 items-end flex-wrap pt-1">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs text-muted mb-1">先发测试（强烈建议）</label>
              <input
                className="w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="你自己的邮箱，确认排版无误后再群发"
              />
            </div>
            <button
              onClick={() => send(true)}
              disabled={sending}
              className="px-4 py-2 text-sm border border-ink text-ink hover:bg-ink hover:text-bg transition disabled:opacity-50"
            >
              {sending ? '发送中…' : '发送测试邮件'}
            </button>
            <button
              onClick={() => send(false)}
              disabled={sending}
              className="px-4 py-2 text-sm border border-accent text-accent hover:bg-accent hover:text-white transition disabled:opacity-50"
            >
              {sending ? '发送中…' : `群发给 ${stats.active} 人`}
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
          placeholder="搜索邮箱"
        />
      </div>

      {loading ? (
        <p className="text-muted">加载中…</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {filtered.map((s) => (
            <div key={s.id} className="flex items-center gap-4 p-3 hover:bg-surface-2">
              <span className="text-sm text-ink flex-1 truncate">{s.email}</span>
              <span className="text-xs text-muted w-12 text-center uppercase">{s.locale || '—'}</span>
              <span className={`text-xs px-2 py-1 border border-line w-16 text-center ${s.status === 'active' ? 'text-accent' : 'text-muted'}`}>
                {s.status === 'active' ? '有效' : '已退订'}
              </span>
              <span className="text-xs text-muted w-28">
                {new Date(s.createdAt).toLocaleDateString('zh-CN')}
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
              {subs.length === 0 ? '暂无订阅。访客在前台首页底部「订阅电子报」填入邮箱后会出现在这里。' : '没有匹配的邮箱。'}
            </p>
          )}
        </div>
      )}

      {/* ---- 发信历史 ---- */}
      {campaigns.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-ink mb-2">发信记录</h2>
          <div className="border border-line divide-y divide-line">
            {campaigns.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 text-xs">
                <span className="text-muted w-28 shrink-0">
                  {new Date(c.createdAt).toLocaleString('zh-CN', { hour12: false })}
                </span>
                <span className="text-ink flex-1 truncate">{c.subject}</span>
                <span className={`px-2 py-0.5 border ${c.kind === 'test' ? 'border-line text-muted' : 'border-line text-ink'}`}>
                  {c.kind === 'test' ? '测试' : '群发'}
                </span>
                <span className="text-muted w-24 text-right">
                  {c.kind === 'test' ? (c.sent ? '已发' : '失败') : `${c.sent}/${c.recipients} 成功`}
                </span>
                {c.dryRun && <span className="px-2 py-0.5 border border-amber-500 text-amber-700">演练</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}