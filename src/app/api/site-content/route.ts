import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 前台公共内容：导航分类 + 页脚配置 + 首页介绍文案。
 * 站头部/页脚客户端组件一次性拉取，后台改完刷新即生效。
 *
 * 注：2026-10-19 移除公告条（announce.*）—— 前台顶部公告条已按需求下线，
 * 后台编辑区与 API 输出同步清理；存量 SiteSetting 数据保留不删。
 */
export async function GET() {
  const [categories, settings] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { slug: true, name: true, nameZh: true },
    }),
    prisma.siteSetting.findMany({
      where: {
        key: {
          in: [
            'footer.config',
            'home.seoHeading.ko', 'home.seoHeading.zh', 'home.seoHeading.en',
            'home.seoBody.ko', 'home.seoBody.zh', 'home.seoBody.en',
          ],
        },
      },
    }),
  ]);
  const homeSeo: Record<string, string> = {};
  let footer: unknown = null;
  for (const s of settings) {
    if (s.key === 'footer.config') {
      try {
        footer = JSON.parse(s.value);
      } catch {
        footer = null;
      }
    } else if (s.key.startsWith('home.seo')) {
      homeSeo[s.key] = s.value;
    }
  }
  return NextResponse.json({ categories, footer, homeSeo });
}
