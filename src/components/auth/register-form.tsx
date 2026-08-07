'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';

const ERR: Record<string, { ko: string; zh: string; en: string }> = {
  invalid_email: { ko: '이메일 형식이 올바르지 않습니다', zh: '邮箱格式不正确', en: 'Invalid email format' },
  password_too_short: { ko: '비밀번호는 6자 이상이어야 합니다', zh: '密码至少 6 位', en: 'Password must be at least 6 characters' },
  email_taken: { ko: '이미 가입된 이메일입니다', zh: '该邮箱已注册', en: 'Email already registered' },
  server_error: { ko: '서버 오류가 발생했습니다', zh: '服务器错误', en: 'Server error' },
};

export function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const { locale, dict } = useLocale();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(ERR[data.error]?.[locale] ?? ERR.server_error[locale]);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setErr(ERR.server_error[locale]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-xs tracking-widest text-muted">
          {dict.nav.account}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-line bg-surface px-4 py-3 outline-none focus:border-accent transition-colors mt-1"
        />
      </div>
      <div>
        <label className="text-xs tracking-widest text-muted">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-line bg-surface px-4 py-3 outline-none focus:border-accent transition-colors mt-1"
        />
      </div>
      <div>
        <label className="text-xs tracking-widest text-muted">
          {dict.common.options}
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
