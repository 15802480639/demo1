'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';

const ERR: Record<string, { ko: string; zh: string; en: string }> = {
  invalid_credentials: { ko: '이메일 또는 비밀번호가 올바르지 않습니다', zh: '邮箱或密码错误', en: 'Invalid email or password' },
  missing_fields: { ko: '모든 항목을 입력하세요', zh: '请填写所有字段', en: 'Please fill all fields' },
  server_error: { ko: '서버 오류가 발생했습니다', zh: '服务器错误', en: 'Server error' },
  not_admin: { ko: '관리자 권한이 필요합니다', zh: '需要管理员权限', en: 'Admin access required' },
};

export function LoginForm({
  redirectTo,
  requireAdmin = false,
}: {
  redirectTo: string;
  requireAdmin?: boolean;
}) {
  const { locale, dict } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(ERR[data.error]?.[locale] ?? ERR.server_error[locale]);
        return;
      }
      if (requireAdmin && data.user.role !== 'admin') {
        setErr(ERR.not_admin[locale]);
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
