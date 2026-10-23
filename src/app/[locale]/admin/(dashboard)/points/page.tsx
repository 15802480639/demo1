'use client';

import { useEffect, useState } from 'react';
import { getDictionary } from '@/i18n/dictionaries';
import { useLocale } from '@/components/i18n/locale-provider';

type Rule = {
  enabled: boolean;
  earnPercent: number;
  minSpendForUse: number;
  pointsPerKrw: number;
  maxUsePercent: number;
};

export default function AdminPointsPage() {
  useLocale(); // 后台固定中文
  const t = getDictionary('zh').admin;
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
      setMsg('✓ 已保存，前台立即生效');
    } else {
      setMsg('保存失败，请重试');
    }
    setSaving(false);
  }

  const input =
    'w-full border border-line bg-surface px-3 py-2 outline-none focus:border-accent transition-colors text-sm';
  const label = 'text-xs tracking-widest text-muted block mb-1';

  if (loading || !rule) {
    return <p className="text-muted">加载中…</p>;
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-3xl text-ink">{t.pointSettings}</h1>
        <p className="text-xs text-muted mt-1">
          这里设置全站统一的积分规则；单个商品可以在「商品管理」里单独覆盖返积分比例和是否可用积分抵扣。
        </p>
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
          <p className="text-xs text-muted mt-2">
            关闭后：前台不显示积分入口，用户不能用积分抵扣，已有的积分余额保留不清零。
          </p>
        </div>

        {/* 返积分 */}
        <div className="border border-line p-5 space-y-4">
          <div>
            <h2 className="font-display text-xl text-ink mb-1">一、怎么获得积分</h2>
            <p className="text-xs text-muted">
              用户购买商品后获得积分。默认按「实付金额」的百分比计算（实付 = 订单总额 − 优惠券 − 积分抵扣）。
            </p>
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
              例：设为 5，用户实付 100,000₩ 获得 5,000 积分。
              商品可单独设置自己的比例，商品没设置时用这里的默认值。
            </p>
          </div>
        </div>

        {/* 用积分 */}
        <div className="border border-line p-5 space-y-4">
          <div>
            <h2 className="font-display text-xl text-ink mb-1">二、怎么使用积分</h2>
            <p className="text-xs text-muted">
              用户在结算页输入想用的积分数，自动换算成金额从订单里扣掉。
            </p>
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
            <p className="text-[11px] text-muted mt-1">
              例：设为 50000，订单实付满 50,000₩ 才能勾选使用积分。
            </p>
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
            <p className="text-[11px] text-muted mt-1">
              例：设为 100，则 100 积分 = 1₩，10,000 积分 = 100₩。数值越小积分越值钱。
            </p>
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
            <p className="text-[11px] text-muted mt-1">
              防止用户一次性把积分全用光。设为 30 表示单笔最多抵订单金额的 30%。
            </p>
          </div>
        </div>

        {/* 预览 */}
        <div className="border border-accent/40 bg-accent/5 p-5 text-sm">
          <h3 className="text-ink font-medium mb-2">规则预览</h3>
          <ul className="text-xs text-muted space-y-1 list-disc pl-4">
            <li>
              订单实付满 <b className="text-ink">{rule.minSpendForUse.toLocaleString()}₩</b> 可用积分
            </li>
            <li>
              <b className="text-ink">{rule.pointsPerKrw.toLocaleString()}</b> 积分 = 1₩，即
              1 积分 ≈ {rule.pointsPerKrw > 0 ? (1 / rule.pointsPerKrw).toFixed(4) : '0'}₩
            </li>
            <li>
              单笔最多抵订单金额的 <b className="text-ink">{rule.maxUsePercent}%</b>
            </li>
            <li>
              实付每 10,000₩ 约返 <b className="text-ink">
                {Math.floor((10000 * rule.earnPercent) / 100).toLocaleString()}
              </b>{' '}
              积分
            </li>
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="btn-gold">
            {saving ? '保存中…' : t.save}
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
