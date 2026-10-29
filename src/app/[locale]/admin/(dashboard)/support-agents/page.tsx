'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';

type Agent = {
  id: string;
  username: string;
  displayName: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

// 后台「客服账号管理」
// 这里的账号只用于登录 H5 客服台（/cs），与商城用户体系完全隔离。
export default function AdminSupportAgentsPage() {
  const { dict } = useLocale();
  const t = dict.admin;

  const [list, setList] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // 新建账号表单
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // 改密码弹窗
  const [pwdTarget, setPwdTarget] = useState<Agent | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/support-agents', { cache: 'no-store' });
      const d = await res.json();
      if (res.ok) setList(d.agents || []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createAgent(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setMsg('');
    setCreating(true);
    try {
      const res = await fetch('/api/admin/support-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayName, password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        const map: Record<string, string> = {
          bad_username: t.saErrUsername,
          weak_password: t.saErrWeakPwd,
          username_taken: t.saErrTaken,
          missing_fields: t.saErrUsername,
        };
        setErr(map[d.error] ?? (d.error || 'error'));
        return;
      }
      setUsername('');
      setDisplayName('');
      setPassword('');
      setMsg(t.saCreated);
      load();
    } catch {
      setErr('server_error');
    } finally {
      setCreating(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwdTarget) return;
    setErr('');
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/support-agents/${pwdTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPwd }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error === 'weak_password' ? t.saErrWeakPwd : d.error || 'error');
        return;
      }
      setPwdTarget(null);
      setNewPwd('');
      setMsg(t.saPwdChanged);
    } catch {
      setErr('server_error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(a: Agent) {
    setErr('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/support-agents/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !a.active }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || 'error');
        return;
      }
      setMsg(t.saStatusChanged);
      load();
    } catch {
      setErr('server_error');
    }
  }

  async function removeAgent(a: Agent) {
    if (!window.confirm(t.saDeleteConfirm)) return;
    setErr('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/support-agents/${a.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || 'error');
        return;
      }
      setMsg(t.saDeleted);
      load();
    } catch {
      setErr('server_error');
    }
  }

  function fmtDate(s: string | null) {
    if (!s) return t.saNeverLogin;
    try {
      return new Date(s).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return s;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl mb-1">{t.saTitle}</h1>
        <p className="text-xs text-muted">
          {t.saSubtitle} · {t.saH5Hint}
        </p>
      </div>

      {/* 新建账号 */}
      <form
        onSubmit={createAgent}
        className="border border-line p-4 space-y-3 bg-surface max-w-[520px]"
      >
        <h2 className="text-sm font-medium">{t.saCreate}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted">{t.saUsername}</label>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.trim())}
              placeholder={t.saUsernamePh}
              className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-ink mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted">{t.saDisplayName}</label>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.trim())}
              placeholder={t.saDisplayNamePh}
              className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-ink mt-1"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted">{t.saPassword}</label>
          <input
            required
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.saPasswordPh}
            className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-ink mt-1 max-w-[260px]"
          />
        </div>
        <button type="submit" disabled={creating} className="btn-gold px-5 py-2 text-sm disabled:opacity-60">
          {creating ? '…' : t.saCreateBtn}
        </button>
      </form>

      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {/* 账号列表 */}
      <div className="border border-line bg-surface">
        {loading ? (
          <p className="text-sm text-muted p-4">…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted p-4">{t.saEmpty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-4 py-3 font-normal">{t.saUsername}</th>
                  <th className="px-4 py-3 font-normal">{t.saDisplayName}</th>
                  <th className="px-4 py-3 font-normal">状态</th>
                  <th className="px-4 py-3 font-normal">{t.saLastLogin}</th>
                  <th className="px-4 py-3 font-normal">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{a.username}</td>
                    <td className="px-4 py-3">{a.displayName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 border ${
                          a.active
                            ? 'text-green-700 border-green-700/30'
                            : 'text-muted border-line'
                        }`}
                      >
                        {a.active ? t.saActive : t.saInactive}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{fmtDate(a.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setPwdTarget(a);
                            setNewPwd('');
                            setErr('');
                          }}
                          className="text-xs px-2.5 py-1 border border-line hover:border-ink"
                        >
                          {t.saResetPwd}
                        </button>
                        <button
                          onClick={() => toggleActive(a)}
                          className="text-xs px-2.5 py-1 border border-line hover:border-ink"
                        >
                          {a.active ? t.saDisable : t.saEnable}
                        </button>
                        <button
                          onClick={() => removeAgent(a)}
                          className="text-xs px-2.5 py-1 border border-red-600/40 text-red-600 hover:bg-red-600/10"
                        >
                          {t.saDelete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 改密码弹窗 */}
      {pwdTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-5"
          onClick={() => setPwdTarget(null)}
        >
          <form
            onSubmit={resetPassword}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line p-5 w-full max-w-[380px]"
          >
            <h3 className="text-sm font-medium mb-1">{t.saResetPwdTitle}</h3>
            <p className="text-xs text-muted mb-4">
              {pwdTarget.displayName}（{pwdTarget.username}）
            </p>
            <input
              required
              type="text"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder={t.saNewPwd}
              className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-ink"
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setPwdTarget(null)}
                className="flex-1 px-4 py-2 text-sm border border-line"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 btn-gold px-4 py-2 text-sm disabled:opacity-60"
              >
                {saving ? '…' : '确定'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
