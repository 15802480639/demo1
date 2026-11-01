'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import {
  STAFF_ROLES,
  STAFF_ROLE_LABELS,
  AGENT_ROLES,
  AGENT_ROLE_LABELS,
  type StaffRole,
  type AgentRole,
} from '@/lib/permissions';

type Admin = {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
  staffRole: string;
  createdAt: string;
};

type Agent = {
  id: string;
  username: string;
  displayName: string;
  active: boolean;
  permissions: string;
  lastLoginAt: string | null;
};

export function StaffClient() {
  const { locale } = useLocale();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const L = {
    ko: {
      admins: '관리자 계정',
      agents: '상담원 계정',
      tier: '권한 등급',
      change: '변경',
      saved: '저장되었습니다',
      failed: '저장에 실패했습니다',
      lastLogin: '최근 로그인',
      never: '없음',
      active: '재직',
      inactive: '퇴직',
    },
    zh: {
      admins: '管理员账号',
      agents: '客服账号',
      tier: '权限档位',
      change: '变更',
      saved: '保存成功',
      failed: '保存失败',
      lastLogin: '最近登录',
      never: '无',
      active: '在职',
      inactive: '停用',
    },
    en: {
      admins: 'Admin accounts',
      agents: 'Agent accounts',
      tier: 'Permission tier',
      change: 'Change',
      saved: 'Saved',
      failed: 'Save failed',
      lastLogin: 'Last login',
      never: 'Never',
      active: 'Active',
      inactive: 'Inactive',
    },
  }[locale === 'zh' ? 'zh' : locale === 'en' ? 'en' : 'ko'];

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/staff');
    if (res.status === 403) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setAdmins(data.admins ?? []);
    setAgents(data.agents ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function changeAdminRole(userId: string, staffRole: string) {
    setSaving(userId);
    setMsg('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, staffRole }),
      });
      if (!res.ok) throw new Error('fail');
      setMsg(L.saved);
      await load();
    } catch {
      setMsg(L.failed);
    } finally {
      setSaving(null);
    }
  }

  const select =
    'border border-line bg-surface px-3 py-1.5 text-xs outline-none focus:border-accent';

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-3xl text-ink">
          {locale === 'zh' ? '管理员权限' : locale === 'en' ? 'Staff & Roles' : '관리자 권한'}
        </h1>
        <p className="text-xs text-muted mt-1">
          {locale === 'zh'
            ? '为每位管理员指定权限档位，权限变更立即生效。'
            : locale === 'en'
              ? 'Assign a permission tier to each admin. Changes apply immediately.'
              : '관리자별 권한 등급을 지정합니다. 변경은 즉시 적용됩니다.'}
        </p>
      </div>

      {msg && <p className="mb-3 text-xs text-accent">{msg}</p>}

      {loading ? (
        <p className="text-muted text-sm">…</p>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="text-sm tracking-widest text-muted mb-2">{L.admins}</h2>
            <div className="border border-line divide-y divide-line">
              {admins.map((a) => (
                <div key={a.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium text-ink w-56 truncate">
                    {a.name || a.username || a.email || a.id}
                  </span>
                  <span className="text-xs text-muted w-40 truncate">{a.email ?? ''}</span>
                  <select
                    className={select}
                    value={a.staffRole}
                    disabled={saving === a.id}
                    onChange={(e) => changeAdminRole(a.id, e.target.value)}
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {STAFF_ROLE_LABELS[r][locale === 'zh' ? 'zh' : locale === 'en' ? 'en' : 'ko']}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-muted">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {admins.length === 0 && (
                <p className="p-4 text-xs text-muted">—</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-sm tracking-widest text-muted mb-2">{L.agents}</h2>
            <div className="border border-line divide-y divide-line">
              {agents.map((g) => (
                <div key={g.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium text-ink w-40 truncate">{g.displayName}</span>
                  <span className="text-xs text-muted w-32 truncate">{g.username}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 border ${
                      g.active
                        ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                        : 'border-line text-muted'
                    }`}
                  >
                    {g.active ? L.active : L.inactive}
                  </span>
                  <span className="text-[10px] text-muted">
                    {L.lastLogin}: {g.lastLoginAt ? new Date(g.lastLoginAt).toLocaleString() : L.never}
                  </span>
                  <span className="text-[10px] text-accent ml-auto">
                    {AGENT_ROLE_LABELS[(g.permissions || 'support_basic') as AgentRole]?.[
                      locale === 'zh' ? 'zh' : locale === 'en' ? 'en' : 'ko'
                    ] ?? g.permissions}
                  </span>
                </div>
              ))}
              {agents.length === 0 && <p className="p-4 text-xs text-muted">—</p>}
            </div>
            <p className="mt-2 text-[11px] text-muted">
              {locale === 'zh'
                ? '客服权限档位在「客服账号管理」页调整。'
                : locale === 'en'
                  ? 'Agent tiers are managed on the Support Agents page.'
                  : '상담원 권한 등급은 「상담원 계정 관리」 페이지에서 변경합니다.'}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
