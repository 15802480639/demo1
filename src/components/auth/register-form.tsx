'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';

export function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const { locale, dict } = useLocale();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const errMsg = (code: string) => {
    const map: Record<string, string> = {
      invalid_username: dict.auth.errInvalidUsername,
      username_taken: dict.auth.errUsernameTaken,
      invalid_email: dict.auth.errInvalidEmail,
      email_taken: dict.auth.errEmailTaken,
      password_too_short: dict.auth.errPasswordShort,
    };
    return map[code] ?? dict.auth.errServerError;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          password,
          inviteCode: inviteCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(errMsg(data.error));
        return;
      }
      // 🔴 必须整页跳转：router.push+refresh 存在竞态，
      // 会复用缓存里 session=null 的 layout，导致 header 仍显示「注册/登录」。
      // 硬导航强制 SSR 重新读 cookie（与登录表单同一处理）。
      window.location.assign(redirectTo);
    } catch {
      setErr(dict.auth.errServerError);
    } finally {
      setLoading(false);
    }
  }

  const input =
    'w-full border border-line bg-surface px-4 py-3 outline-none focus:border-accent transition-colors mt-1';

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-xs tracking-widest text-muted">
          {dict.auth.usernameLabel}
        </label>
        <input
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={input}
          placeholder={dict.auth.usernamePh}
        />
      </div>
      <div>
        <label className="text-xs tracking-widest text-muted">
          {dict.account.password}
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={input}
          placeholder={dict.auth.passwordPh}
        />
      </div>
      <div>
        <label className="text-xs tracking-widest text-muted">
          {dict.account.email}（{dict.auth.emailOptionalPh}）
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
          placeholder={dict.auth.emailHint}
        />
      </div>
      <div>
        <label className="text-xs tracking-widest text-muted">
          {dict.auth.inviteCodeLabel}（{dict.auth.emailOptionalPh}）
        </label>
        <input
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          className={input}
          placeholder={dict.auth.inviteCodePh}
          autoCapitalize="characters"
          style={{ textTransform: 'uppercase' }}
        />
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button type="submit" disabled={loading} className="btn-gold w-full">
        {loading ? '…' : dict.nav.register}
      </button>
      <p className="text-center text-sm text-muted">
        <Link href={`/${locale}/login`} className="text-accent hover:underline">
          {dict.nav.login}
        </Link>
      </p>
    </form>
  );
}
