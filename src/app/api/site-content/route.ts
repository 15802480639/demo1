import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCategoryTree } from '@/lib/category-tree';
import { getKakaoUrl } from '@/lib/kakao';

export const dynamic = 'force-dynamic';

/**
 * 前台公共内容：导航分类 + 页脚配置 + 首页介绍文案。
 * 站头部/页脚客户端组件一次性拉取，后台改完刷新即生效。
 *
 * 注：2026-10-19 移除公告条（announce.*）—— 前台顶部公告条已按需求下线，
 * 后台编辑区与 API 输出同步清理；存量 SiteSetting 数据保留不删。
 */
export async function GET() {
  const [tree, settings, kakaoUrl] = await Promise.all([
    getCategoryTree(),
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
    getKakaoUrl(),
  ]);
  // 导航用扁平列表 + 层级标记（前端渲染下钻菜单更方便）
  const flat: {
    id: string;
    slug: string;
    name: string;
    nameZh: string | null;
    parentId: string | null;
    depth: number;
    childSlugs: string[];
  }[] = [];
  const walk = (
    nodes: Awaited<ReturnType<typeof getCategoryTree>>,
    depth: number,
  ) => {
    for (const n of nodes) {
      flat.push({
        id: n.id,
        slug: n.slug,
        name: n.name,
        nameZh: n.nameZh,
        parentId: n.parentId,
        depth,
        childSlugs: n.children.map((c) => c.slug),
      });
      walk(n.children, depth + 1);
    }
  };
  walk(tree, 1);

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
  return NextResponse.json({ categories: flat, footer, homeSeo, kakaoUrl });
}
