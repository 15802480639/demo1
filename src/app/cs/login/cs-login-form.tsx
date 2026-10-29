'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { csDict } from '@/lib/cs-dict';

// H5 客服登录表单
// 账号由后台「客服账号管理」创建，商城账号在此一律无效（后端只认 ChatAgent 表）。
// 界面固定韩文（客服团队为韩国人），文案见 src/lib/cs-dict.ts
export function CsLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const errMsg = (code: string) => {
    const map: Record<string, string> = {
      missing_fields: csDict.errMissingFields,
      invalid_credentials: csDict.errInvalidCredentials,
      agent_disabled: csDict.errAgentDisabled,
      server_error: csDict.errServerError,
    };
    return map[code] ?? csDict.errLoginFailed;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/cs/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(errMsg(data.error));
        return;
      }
      // 🔴 整页跳转：router.push 会复用缓存里的 session=null，
      // 导致进 /cs 又被踢回登录页（与 admin 登录同一个坑）。
      window.location.assign('/cs');
    } catch {
      setErr(errMsg('server_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-xs tracking-widest text-muted">{csDict.loginAccountLabel}</label>
        <input
          required
          autoComplete="username"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          value={username}
          onChange={(e) => setUsername(e.target.value.trim())}
          className="w-full border border-line bg-surface px-4 py-3 outline-none focus:border-accent transition-colors mt-1"
          placeholder={csDict.loginAccountPh}
        />
      </div>
      <div>
        <label className="text-xs tracking-widest text-muted">{csDict.loginPasswordLabel}</label>
        <input
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-line bg-surface px-4 py-3 outline-none focus:border-accent transition-colors mt-1"
          placeholder={csDict.loginPasswordPh}
        />
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button type="submit" disabled={loading} className="btn-gold w-full disabled:opacity-60">
        {loading ? csDict.loginSubmitting : csDict.loginSubmit}
      </button>
    </form>
  );
}
