'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';

export function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const { locale, dict } = useLocale();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(errMsg(data.error));
        return;
      }
      router.push(redirectTo);
      router.refresh();
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
