'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';

type Row = {
  id: string;
  username: string | null;
  name: string | null;
  email: string | null;
  role: string;
  inviteCode: string | null;
  upline: string | null;
  uplineId: string | null;
  inviteeCount: number;
};

export default function AdminReferralsPage() {
  const { locale, dict } = useLocale();
  const t = dict.admin;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/referrals');
    const data = await res.json();
    setRows(data.rows ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return rows;
    return rows.filter((r) =>
      [r.name, r.username, r.email, r.inviteCode, r.upline]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(kw)),
    );
  }, [rows, q]);

  const withInvitees = filtered.filter((r) => r.inviteeCount > 0).length;

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-3xl text-ink">{t.referrals}</h1>
        <p className="text-xs text-muted mt-1">{t.referralsIntro}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.rfSearch}
          className="border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent w-72"
        />
        <span className="text-xs text-muted self-center">
          {filtered.length} / {rows.length} · {t.rfInvitees}: {withInvitees}
        </span>
      </div>

      {loading ? (
        <p className="text-muted">{t.cLoading}</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center gap-4 p-4 hover:bg-surface-2">
              <div className="flex-1 min-w-0">
                <p className="text-ink truncate">
                  {r.name || r.username || r.email || '—'}
                  {r.role === 'admin' && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-muted/20 text-muted rounded">
                      ADMIN
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {r.username ? `@${r.username}` : ''}
                  {r.username && r.email ? ' · ' : ''}
                  {r.email || t.cNoEmail}
                </p>
              </div>

              <div className="w-40 shrink-0">
                <p className="text-[10px] tracking-widest text-muted">{t.rfInviteCode}</p>
                <p className="font-mono text-sm text-ink truncate">
                  {r.inviteCode || '—'}
                </p>
              </div>

              <div className="w-36 shrink-0">
                <p className="text-[10px] tracking-widest text-muted">{t.rfUpline}</p>
                <p className="text-sm text-ink truncate">{r.upline || t.rfNoUpline}</p>
              </div>

              <div className="w-24 shrink-0 text-right">
                <p className="text-[10px] tracking-widest text-muted">{t.rfInvitees}</p>
                <p className="font-display text-lg text-accent">{r.inviteeCount}</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="p-5 text-sm text-muted">
              {rows.length === 0 ? t.rfNoInvitees : t.cNoMatch}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
