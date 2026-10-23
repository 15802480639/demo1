import { prisma } from '@/lib/prisma';

/**
 * 分类树工具 —— 3 级分类的唯一真源。
 *
 * 数据结构：Category 自关联（parentId），理论上可无限层级，
 * 但业务上限制最多 3 级（MAX_DEPTH）。所有层级判断、环路检测、
 * 后代收集都收敛到这里，避免各处重复实现导致行为不一致。
 */

/** 业务允许的最大分类层级：一级 → 二级 → 三级 */
export const MAX_DEPTH = 3;

export interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  nameZh: string | null;
  parentId: string | null;
  sortOrder: number;
  imageUrl: string | null;
  /** 该节点自身所在层级，1 = 一级分类 */
  depth: number;
  children: CategoryNode[];
}

interface RawCategory {
  id: string;
  slug: string;
  name: string;
  nameZh: string | null;
  parentId: string | null;
  sortOrder: number;
  imageUrl: string | null;
}

function sortCats(list: RawCategory[]): RawCategory[] {
  return [...list].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

/**
 * 把扁平分类列表组装成树。
 * ⚠️ 防御性：parentId 指向不存在的分类时，按一级分类处理（不让数据异常导致整棵树丢失）。
 */
export function buildCategoryTree(list: RawCategory[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const c of list) {
    byId.set(c.id, { ...c, depth: 1, children: [] });
  }

  for (const c of list) {
    const node = byId.get(c.id)!;
    if (c.parentId && byId.has(c.parentId)) {
      byId.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // 计算深度（一级=1）
  const assignDepth = (nodes: CategoryNode[], depth: number) => {
    for (const n of nodes) {
      n.depth = depth;
      assignDepth(n.children, depth + 1);
    }
  };
  assignDepth(roots, 1);

  const sortTree = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    for (const n of nodes) sortTree(n.children);
  };
  sortTree(roots);

  return roots;
}

/** 展平树为按深度排序的列表（后台表格用） */
export function flattenTree(tree: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = [];
  const walk = (nodes: CategoryNode[]) => {
    for (const n of nodes) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(tree);
  return out;
}

/** 取出某个分类自身 + 全部后代（不含祖先）的 id 集合 */
export function collectDescendantIds(
  all: RawCategory[],
  categoryId: string,
): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const c of all) {
    if (!c.parentId) continue;
    const list = childrenOf.get(c.parentId) ?? [];
    list.push(c.id);
    childrenOf.set(c.parentId, list);
  }
  const ids: string[] = [categoryId];
  const stack = [categoryId];
  const seen = new Set<string>([categoryId]);
  while (stack.length) {
    const cur = stack.pop()!;
    for (const child of childrenOf.get(cur) ?? []) {
      if (seen.has(child)) continue; // 数据异常时自保，防无限循环
      seen.add(child);
      ids.push(child);
      stack.push(child);
    }
  }
  return ids;
}

/**
 * 校验「把 childId 挂到 parentId 下」是否合法。
 * 返回 null 表示合法，否则返回错误码。
 *
 * bad_self    —— 自己挂自己
 * bad_cycle   —— 会形成 A→B→A 环路
 * too_deep    —— 会超过 3 级
 * no_parent   —— 父分类不存在
 */
export function validateParentChange(
  all: RawCategory[],
  childId: string,
  parentId: string | null,
): 'bad_self' | 'bad_cycle' | 'too_deep' | 'no_parent' | null {
  if (!parentId) return null;
  if (parentId === childId) return 'bad_self';

  const byId = new Map(all.map((c) => [c.id, c]));
  if (!byId.has(parentId)) return 'no_parent';

  // 父分类的祖先链里不能出现 childId（否则成环）
  let cursor: string | null = parentId;
  const guard = new Set<string>();
  while (cursor) {
    if (cursor === childId) return 'bad_cycle';
    if (guard.has(cursor)) break; // 数据本身已有环，止损
    guard.add(cursor);
    cursor = byId.get(cursor)?.parentId ?? null;
  }

  // 挂上去之后的最大深度不能超过 MAX_DEPTH
  const depthOf = (id: string): number => {
    let d = 1;
    let cur: string | null = id;
    const seen = new Set<string>();
    while (cur) {
      if (seen.has(cur)) break;
      seen.add(cur);
      const p: string | null = byId.get(cur)?.parentId ?? null;
      if (!p) break;
      d += 1;
      cur = p;
    }
    return d;
  };

  const parentDepth = depthOf(parentId);
  // parentDepth 是父节点自身层级；子节点挂上去后层级 = parentDepth + 1
  // 若父节点自己还有子树（改挂后原有子级会跟着下沉一层），要加上最大子树高度
  const subtreeHeight = (id: string): number => {
    const children = all.filter((c) => c.parentId === id);
    if (!children.length) return 0;
    return Math.max(...children.map((c) => 1 + subtreeHeight(c.id)));
  };
  const newMaxDepth = parentDepth + 1 + subtreeHeight(childId);
  if (newMaxDepth > MAX_DEPTH) return 'too_deep';

  return null;
}

/**
 * 取分类自身 + 全部后代的 slug 集合。
 * 用于「点一级分类也能看到三级分类下的商品」。
 *
 * ⚠️ 商品列表页每页会调用 2 次（count + list），分类表虽小但不该每次全表拉，
 * 这里加 30 秒进程内缓存。分类改动极少，30 秒延迟可接受。
 */
export async function getCategoryScopeSlugs(slug: string): Promise<string[] | null> {
  const all = await getAllCategoriesCached();
  const target = all.find((c) => c.slug === slug);
  if (!target) return null;
  const ids = collectDescendantIds(all, target.id);
  const idSet = new Set(ids);
  return all.filter((c) => idSet.has(c.id)).map((c) => c.slug);
}

/** 取所有分类（含后代），供 sitemap / llms.txt / 导航使用 */
export async function getAllCategories(): Promise<RawCategory[]> {
  return prisma.category.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      nameZh: true,
      parentId: true,
      sortOrder: true,
      imageUrl: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

/**
 * 带 30 秒进程内缓存的分类全量读取。
 * 商品查询（count + list）会连续调 2 次，缓存可省一半查询。
 */
let cache: { at: number; data: RawCategory[] } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getAllCategoriesCached(): Promise<RawCategory[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;
  const data = await getAllCategories();
  cache = { at: Date.now(), data };
  return data;
}

/** 后台改分类后主动失效缓存 */
export function invalidateCategoryCache() {
  cache = null;
}

/** 取分类树（前台导航 / 后台展示用） */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const all = await getAllCategories();
  return buildCategoryTree(all);
}

/**
 * 解析分类路径：把 URL 路径段（如 ['women','tops']）解析成从一级到末级的分类节点链。
 * 找不到或链条断裂时返回 null。
 *
 * ⚠️ slug 可能来自 URL（已解码）或数据库（原始），这里做一次归一化，
 * 保证「韩文 / 中文 / 英文」等非 ASCII slug 都能匹配上。
 */
export function resolveCategoryPath(
  tree: CategoryNode[],
  path: string[],
): CategoryNode[] | null {
  if (!path.length) return null;
  const norm = (s: string) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  let level = tree;
  const chain: CategoryNode[] = [];
  for (const raw of path) {
    const seg = norm(raw);
    const hit =
      level.find((n) => n.slug === seg) ??
      level.find((n) => norm(n.slug) === seg);
    if (!hit) return null;
    chain.push(hit);
    level = hit.children;
  }
  return chain;
}

/** 面包屑文本（按当前语言取中文名优先） */
export function categoryLabel(node: CategoryNode, locale: string): string {
  if (locale === 'zh' && node.nameZh) return node.nameZh;
  return node.name;
}
