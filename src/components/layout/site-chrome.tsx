'use client';

import { usePathname } from 'next/navigation';

/**
 * 后台页面（/{locale}/admin/**）不渲染前台公告条/页头/页脚。
 * 布局是服务端组件拿不到 pathname，所以用这个客户端开关包一层。
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  if (pathname.includes('/admin')) return null;
  return <>{children}</>;
}
