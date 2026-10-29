import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCsSession } from '@/lib/cs-auth';
import { csDict } from '@/lib/cs-dict';
import { CsLoginForm } from './cs-login-form';

export const metadata: Metadata = {
  title: csDict.loginTitle,
  robots: { index: false, follow: false },
};

// /cs/login —— H5 客服登录页
// 已登录则直接进工作台（避免登录页闪现）
export default async function CsLoginPage() {
  const session = await getCsSession();
  if (session) redirect('/cs');

  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <p className="text-[11px] tracking-[0.3em] text-accent uppercase">J&amp;D</p>
          <h1 className="text-2xl font-medium mt-2">{csDict.loginTitle}</h1>
          <p className="text-sm text-muted mt-2">{csDict.loginSubtitle}</p>
        </div>
        <div className="bg-surface border border-line p-6">
          <CsLoginForm />
        </div>
        <p className="text-center text-[11px] text-muted mt-6">{csDict.loginFooter}</p>
      </div>
    </main>
  );
}
