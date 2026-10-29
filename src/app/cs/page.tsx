import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCsSession } from '@/lib/cs-auth';
import { ChatAgentMobile } from '@/components/chat/chat-agent-mobile';

export const metadata: Metadata = {
  title: '客服工作台',
  robots: { index: false, follow: false, nocache: true },
};

// /cs —— H5 客服工作台
// 未登录 → 跳登录页；已登录 → 进移动客服台
export default async function CsPage() {
  const session = await getCsSession();
  if (!session) redirect('/cs/login');

  return <ChatAgentMobile />;
}
