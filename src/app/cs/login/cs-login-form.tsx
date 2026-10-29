'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// H5 客服登录表单
// 账号由后台「客服账号管理」创建，商城账号在此一律无效（后端只认 ChatAgent 表）。
export function CsLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const errMsg = (code: string) => {
    const map: Record<string, string> = {
      missing_fields: '请输入账号和密码',
      invalid_credentials: '账号或密码不正确',
      agent_disabled: '该账号已被停用，请联系管理员',
      server_error: '服务器开小差了，请稍后重试',
    };
    return map[code] ?? '登录失败，请重试';
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
        <label className="text-xs tracking-widest text-muted">客服账号</label>
        <input
          required
          autoComplete="username"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          value={username}
          onChange={(e) => setUsername(e.target.value.trim())}
          className="w-full border border-line bg-surface px-4 py-3 outline-none focus:border-accent transition-colors mt-1"
          placeholder="请输入客服账号"
        />
      </div>
      <div>
        <label className="text-xs tracking-widest text-muted">密码</label>
        <input
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-line bg-surface px-4 py-3 outline-none focus:border-accent transition-colors mt-1"
          placeholder="请输入密码"
        />
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button type="submit" disabled={loading} className="btn-gold w-full disabled:opacity-60">
        {loading ? '登录中…' : '登录'}
      </button>
    </form>
  );
}
