'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/i18n/locale-provider';
import type { GeoAudit, GeoCheck } from '@/lib/geo-audit';

const ICON: Record<GeoCheck['status'], string> = {
  pass: '✓',
  warn: '!',
  fail: '×',
};

const STYLE: Record<GeoCheck['status'], string> = {
  pass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  fail: 'border-red-200 bg-red-50 text-red-800',
};

const DIM_KEYS = ['entity', 'schema', 'content', 'index', 'multi', 'authority'] as const;

export default function GeoHealthCheck({ audit }: { audit: GeoAudit }) {
  const { dict } = useLocale();
  const t = dict.admin;
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [pushMsg, setPushMsg] = useState('');
  const [pushing, setPushing] = useState(false);

  async function rerun() {
    setRunning(true);
    try {
      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  async function pushAll() {
    setPushing(true);
    setPushMsg('');
    try {
      const res = await fetch('/api/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const d = await res.json();
      setPushMsg(
        d.ok
          ? `✓ ${t.pushResult}: ${d.submitted}/${d.totalCollected ?? d.submitted}`
          : `${t.pushResult}: ${d.error ?? `HTTP ${d.status ?? '?'}`}`
      );
    } catch (e) {
      setPushMsg(`${t.pushResult}: ${e instanceof Error ? e.message : 'failed'}`);
    } finally {
      setPushing(false);
    }
  }

  const gradeColor =
    audit.total >= 70
      ? 'text-emerald-600'
      : audit.total >= 55
        ? 'text-amber-600'
        : 'text-red-600';

  const dimLabel = (key: string) =>
    key === 'schema'
      ? t.ghSchema
      : key === 'content'
        ? t.ghContent
        : key === 'index'
          ? t.ghIndex
          : key === 'multi'
            ? t.ghMulti
            : key === 'authority'
              ? t.ghAuthority
              : t.ghEntity;
  const dimDesc = (key: string) =>
    key === 'schema'
      ? t.ghSchemaDesc
      : key === 'content'
        ? t.ghContentDesc
        : key === 'index'
          ? t.ghIndexDesc
          : key === 'multi'
            ? t.ghMultiDesc
            : key === 'authority'
              ? t.ghAuthorityDesc
              : t.ghEntityDesc;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl text-ink">{t.geoAudit}</h1>
          <p className="text-sm text-muted mt-1">{t.geoAuditIntro}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={rerun} disabled={running} className="btn-outline">
            {running ? t.geoAuditRunning : t.geoAuditRun}
          </button>
          <button onClick={pushAll} disabled={pushing} className="btn-gold">
            {pushing ? t.geoAuditRunning : t.pushAll}
          </button>
        </div>
      </div>

      {pushMsg && (
        <p className="mt-3 text-xs text-accent border border-line bg-surface px-3 py-2 inline-block">
          {pushMsg}
        </p>
      )}

      {/* 总分 */}
      <div className="border border-line bg-surface p-6 mt-6 flex flex-wrap items-center gap-8">
        <div className="flex items-baseline gap-3">
          <span className={`font-display text-6xl ${gradeColor}`}>{audit.grade}</span>
          <div>
            <div className="text-xs tracking-widest text-muted">{t.geoAuditGrade}</div>
            <div className="font-display text-3xl text-ink">
              {audit.total}
              <span className="text-base text-muted"> / 100</span>
            </div>
          </div>
        </div>
        <div className="flex gap-6 text-sm">
          <span className="text-emerald-700">✓ {audit.summary.pass}</span>
          <span className="text-amber-700">! {audit.summary.warn}</span>
          <span className="text-red-700">× {audit.summary.fail}</span>
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="h-2 bg-line">
            <div
              className="h-2 transition-all"
              style={{
                width: `${audit.total}%`,
                background: audit.total >= 70 ? '#059669' : audit.total >= 55 ? '#d97706' : '#dc2626',
              }}
            />
          </div>
        </div>
      </div>

      {/* 六维度 */}
      <div className="grid gap-4 lg:grid-cols-2 mt-6">
        {audit.dimensions.map((d) => (
          <section key={d.key} className="border border-line bg-surface p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl text-ink">
                {dimLabel(d.key) ?? d.nameZh}
              </h2>
              <span className="text-sm text-muted">
                {d.score}
                <span className="text-xs"> / {d.weight}</span>
              </span>
            </div>
            <p className="text-xs text-muted mt-1 mb-3">{dimDesc(d.key)}</p>

            <div className="h-1 bg-line mb-4">
              <div
                className="h-1 bg-accent"
                style={{ width: `${d.weight === 0 ? 0 : (d.score / d.weight) * 100}%` }}
              />
            </div>

            <ul className="space-y-2">
              {d.checks.map((c) => (
                <li
                  key={c.id}
                  className={`border px-3 py-2 text-xs ${STYLE[c.status]}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">{ICON[c.status]}</span>
                    <div className="min-w-0">
                      <div className="font-medium">{c.label}</div>
                      <div className="opacity-80 mt-0.5">{c.detail}</div>
                      {c.fix && c.status !== 'pass' && (
                        <div className="mt-1.5 pt-1.5 border-t border-current/20">
                          <span className="font-medium">→ {c.fix}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}