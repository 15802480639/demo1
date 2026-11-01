'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';

type Log = {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string;
  detail: string;
  ip: string | null;
  createdAt: string;
};

type Actor = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  staffRole: string | null;
};

export function AuditLogsClient() {
  const { locale, dict } = useLocale();
  const t = dict.admin;
  const [logs, setLogs] = useState<Log[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [fActor, setFActor] = useState('');
  const [fAction, setFAction] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/audit-logs');
    if (res.status === 403) {
      setLogs([]);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setLogs(data.logs ?? []);
    setActors(data.actors ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const actions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action));
    return [...set].sort();
  }, [logs]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return logs.filter((l) => {
      if (fActor && l.actorId !== fActor) return false;
      if (fAction && l.action !== fAction) return false;
      if (kw) {
        const hay = `${l.summary} ${l.actorName} ${l.targetId ?? ''} ${l.action}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [logs, q, fActor, fAction]);

  const input =
    'border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent';
  const select =
    'border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent';

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-3xl text-ink">{t.audTitle}</h1>
        <p className="text-xs text-muted mt-1">{t.audIntro}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.search}
          className={`${input} w-64`}
        />
        <select className={select} value={fActor} onChange={(e) => setFActor(e.target.value)}>
          <option value="">{t.all}</option>
          {actors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name || a.username || a.email || a.id}
            </option>
          ))}
        </select>
        <select className={select} value={fAction} onChange={(e) => setFAction(e.target.value)}>
          <option value="">{t.audAll}</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted self-center">
          {filtered.length} / {logs.length}
        </span>
      </div>

      {loading ? (
        <p className="text-muted text-sm">{t.oLoading}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted border border-line p-5">{t.audEmpty}</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {filtered.map((l) => (
            <div key={l.id} className="p-3 text-sm hover:bg-surface-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-medium text-ink shrink-0">
                  {l.actorName || '—'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 border border-line text-muted shrink-0">
                  {l.action}
                </span>
                <span className="text-xs text-ink-soft flex-1 min-w-0 break-words">
                  {l.summary}
                </span>
                <span className="text-[10px] text-muted shrink-0">
                  {new Date(l.createdAt).toLocaleString()}
                </span>
                <button
                  onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                  className="text-[10px] text-accent shrink-0"
                >
                  {expanded === l.id ? '▾' : '▸'}
                </button>
              </div>
              {expanded === l.id && (
                <div className="mt-2 ml-1 border-l-2 border-line pl-3 text-xs text-muted space-y-1">
                  <p>
                    {t.audActor}: {l.actorName || '—'} ({l.actorRole || '—'})
                  </p>
                  <p>
                    {t.audTarget}: {l.targetType || '—'}
                    {l.targetId ? ` / ${l.targetId}` : ''}
                  </p>
                  {l.ip && <p>IP: {l.ip}</p>}
                  <pre className="whitespace-pre-wrap break-all bg-surface p-2 text-[10px]">
                    {safeJson(l.detail)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function safeJson(s: string): string {
  if (!s) return '{}';
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}
