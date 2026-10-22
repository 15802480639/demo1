'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';

export function LoginForm({
  redirectTo,
  requireAdmin = false,
}: {
  redirectTo: string;
  requireAdmin?: boolean;
}) {
  const { locale, dict } = useLocale();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const errMsg = (code: string) => {
    const map: Record<string, string> = {
      invalid_credentials: dict.auth.errInvalidCredentials,
      missing_fields: dict.auth.errMissingFields,
      not_admin: dict.auth.errNotAdmin,
    };
    return map[code] ?? dict.auth.errServerError;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(errMsg(data.error));
        return;
      }
      if (requireAdmin && data.user.role !== 'admin') {
        setErr(errMsg('not_admin'));
        return;
      }
      // 🔴 必须整页跳转：router.push+refresh 存在竞态，
      // 会复用缓存里 session=null 的 layout，导致 header 仍显示「注册/登录」。
      // 硬导航强制 SSR 重新读 cookie，header/账户页必然一致。
      window.location.assign(redirectTo);
    } catch {
      setErr(dict.auth.errServerError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-xs tracking-widest text-muted">
          {dict.auth.accountLabel}
        </label>
        <input
          required
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          className="w-full border border-line bg-surface px-4 py-3 outline-none focus:border-accent transition-colors mt-1"
          placeholder={dict.auth.accountPh}
        />
      </div>
      <div>
        <label className="text-xs tracking-widest text-muted">
          {dict.account.password}
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-line bg-surface px-4 py-3 outline-none focus:border-accent transition-colors mt-1"
        />
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button type="submit" disabled={loading} className="btn-gold w-full">
        {loading ? '…' : dict.nav.login}
      </button>
      {!requireAdmin && (
        <p className="text-center text-sm text-muted">
          <Link href={`/${locale}/register`} className="text-accent hover:underline">
            {dict.nav.register}
          </Link>
        </p>
      )}
    </form>
  );
}
