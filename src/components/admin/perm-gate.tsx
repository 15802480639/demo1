import { redirect } from 'next/navigation';
import { getStaffPermissions } from '@/lib/auth';
import type { Permission } from '@/lib/permissions';

/**
 * 后台页面级权限守卫（服务端组件）。
 *
 * ⭐ 为什么页面也要拦：
 *   API 层已按权限点拦了数据，但页面本身还能打开（用户会看到空列表/报错），
 *   语义不清、也容易被误认为"功能坏了"。
 *   这里在服务端先判定，没有权限直接跳回后台首页。
 *
 * 用法：
 *   export default async function Page(props) {
 *     return <PermGate perm="audit.view" locale={loc}>{...}</PermGate>;
 *   }
 */
export async function PermGate({
  perm,
  locale,
  children,
}: {
  perm: Permission;
  locale: string;
  children: React.ReactNode;
}) {
  const perms = await getStaffPermissions();
  if (!perms.includes(perm)) {
    redirect(`/${locale}/admin`);
  }
  return <>{children}</>;
}
