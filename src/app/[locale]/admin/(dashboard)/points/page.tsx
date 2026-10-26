'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';

type Rule = {
  enabled: boolean;
  earnPercent: number;
  minSpendForUse: number;
  pointsPerKrw: number;
  maxUsePercent: number;
};

export default function AdminPointsPage() {
  const { dict } = useLocale();
  const t = dict.admin;
  const [rule, setRule] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/points');
    const d = await res.json();
    if (d.rule) setRule(d.rule);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!rule) return;
    setSaving(true);
    setMsg('');
    const res = await fetch('/api/admin/points', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    const d = await res.json();
    if (res.ok) {
      setRule(d.rule);
      setMsg(t.ptSaved);
    } else {
      setMsg(t.ptSaveFailed);
    }
    setSaving(false);
  }

  const input =
    'w-full border border-line bg-surface px-3 py-2 outline-none focus:border-accent transition-colors text-sm';
  const label = 'text-xs tracking-widest text-muted block mb-1';

  if (loading || !rule) {
    return <p className="text-muted">{t.ptLoading}</p>;
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-3xl text-ink">{t.pointSettings}</h1>
        <p className="text-xs text-muted mt-1">{t.ptIntro}</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* 总开关 */}
        <div className="border border-line p-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={(e) => setRule({ ...rule, enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-ink font-medium">{t.pointsEnabled}</span>
          </label>
          <p className="text-xs text-muted mt-2">{t.ptOffHint}</p>
        </div>

        {/* 返积分 */}
        <div className="border border-line p-5 space-y-4">
          <div>
            <h2 className="font-display text-xl text-ink mb-1">{t.ptEarnSection}</h2>
            <p className="text-xs text-muted">{t.ptEarnHint}</p>
          </div>
          <div>
            <label className={label}>{t.pointsEarnPercent}</label>
            <input
              type="number"
              min={0}
              max={100}
              className={input}
              value={rule.earnPercent}
              onChange={(e) => setRule({ ...rule, earnPercent: Number(e.target.value) })}
            />
            <p className="text-[11px] text-muted mt-1">
              {t.ptEarnExample} {t.ptEarnOverride}
            </p>
          </div>
        </div>

        {/* 用积分 */}
        <div className="border border-line p-5 space-y-4">
          <div>
            <h2 className="font-display text-xl text-ink mb-1">{t.ptUseSection}</h2>
            <p className="text-xs text-muted">{t.ptUseHint}</p>
          </div>
          <div>
            <label className={label}>{t.pointsMinSpend}</label>
            <input
              type="number"
              min={0}
              className={input}
              value={rule.minSpendForUse}
              onChange={(e) => setRule({ ...rule, minSpendForUse: Number(e.target.value) })}
            />
            <p className="text-[11px] text-muted mt-1">{t.ptMinSpendExample}</p>
          </div>
          <div>
            <label className={label}>{t.pointsPerKrw}</label>
            <input
              type="number"
              min={1}
              className={input}
              value={rule.pointsPerKrw}
              onChange={(e) => setRule({ ...rule, pointsPerKrw: Number(e.target.value) })}
            />
            <p className="text-[11px] text-muted mt-1">{t.ptRatioExample}</p>
          </div>
          <div>
            <label className={label}>{t.pointsMaxUse}</label>
            <input
              type="number"
              min={0}
              max={100}
              className={input}
              value={rule.maxUsePercent}
              onChange={(e) => setRule({ ...rule, maxUsePercent: Number(e.target.value) })}
            />
            <p className="text-[11px] text-muted mt-1">{t.ptMaxUseHint}</p>
          </div>
        </div>

        {/* 预览 */}
        <div className="border border-accent/40 bg-accent/5 p-5 text-sm">
          <h3 className="text-ink font-medium mb-2">{t.ptPreview}</h3>
          <ul className="text-xs text-muted space-y-1 list-disc pl-4">
            <li
              dangerouslySetInnerHTML={{
                __html: t.ptPreviewMinSpend.replace(
                  '{n}',
                  rule.minSpendForUse.toLocaleString(),
                ),
              }}
            />
            <li
              dangerouslySetInnerHTML={{
                __html: t.ptPreviewRatio
                  .replace('{n}', rule.pointsPerKrw.toLocaleString())
                  .replace('{v}', rule.pointsPerKrw > 0 ? (1 / rule.pointsPerKrw).toFixed(4) : '0'),
              }}
            />
            <li
              dangerouslySetInnerHTML={{
                __html: t.ptPreviewMaxUse.replace('{n}', String(rule.maxUsePercent)),
              }}
            />
            <li
              dangerouslySetInnerHTML={{
                __html: t.ptPreviewEarn.replace(
                  '{n}',
                  Math.floor((10000 * rule.earnPercent) / 100).toLocaleString(),
                ),
              }}
            />
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="btn-gold">
            {saving ? t.saving : t.save}
          </button>
          {msg && (
            <span className={`text-xs ${msg.startsWith('✓') ? 'text-accent' : 'text-red-600'}`}>
              {msg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
