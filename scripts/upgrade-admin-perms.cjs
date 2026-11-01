// 一次性脚本：把后台 API 的鉴权从「只判断是不是 admin」升级为「按权限点判断」
// ⚠️ 这是一次性改造脚本，改造完即可删除（保留在 scripts/ 下作为审计痕迹）。
//
// 规则：
//   1) 把 `const s = await getSession(); if (!s || s.role !== 'admin') {...}` 换成 requirePermission
//   2) 把 `await requireAdmin();` 换成 requirePermission
//   3) 插入对应 import
//   4) 加上操作日志（写操作用）

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const API = path.join(ROOT, 'src/app/api/admin');

/** 相对路径 → 权限点 & 是否写操作 */
const RULES = [
  // 商品
  { f: 'products/route.ts', get: 'products.view', post: 'products.edit' },
  { f: 'products/[id]/route.ts', put: 'products.edit', del: 'products.delete' },
  // 分类
  { f: 'categories/route.ts', get: 'products.view', post: 'categories.edit' },
  { f: 'categories/[id]/route.ts', put: 'categories.edit', del: 'categories.edit' },
  // 品牌
  { f: 'brands/route.ts', get: 'products.view', post: 'brands.edit' },
  { f: 'brands/[id]/route.ts', put: 'brands.edit', del: 'brands.edit' },
  // 订单
  { f: 'orders/route.ts', get: 'orders.view' },
  { f: 'orders/[id]/route.ts', patch: 'orders.edit' },
  // 客户
  { f: 'customers/route.ts', get: 'customers.view' },
  { f: 'customers/[id]/points/route.ts', post: 'customers.points' },
  { f: 'customers/[id]/coupons/route.ts', post: 'coupons.edit' },
  // 积分
  { f: 'points/route.ts', get: 'points.view', put: 'points.manage' },
  // 客服账号
  { f: 'support-agents/route.ts', get: 'agents.manage', post: 'agents.manage' },
  { f: 'support-agents/[id]/route.ts', patch: 'agents.manage', del: 'agents.manage' },
  // 营销
  { f: 'coupons/route.ts', get: 'coupons.edit', post: 'coupons.edit', patch: 'coupons.edit', del: 'coupons.edit' },
  { f: 'newsletter/route.ts', get: 'newsletter.edit' },
  { f: 'newsletter/send/route.ts', post: 'newsletter.send' },
  { f: 'referrals/route.ts', get: 'referrals.view' },
  // 内容
  { f: 'banners/route.ts', get: 'content.edit', post: 'content.edit' },
  { f: 'banners/[id]/route.ts', patch: 'content.edit', del: 'content.edit' },
  { f: 'events/route.ts', get: 'content.edit', post: 'content.edit' },
  { f: 'events/[id]/route.ts', put: 'content.edit', del: 'content.edit' },
  { f: 'faqs/route.ts', get: 'content.edit', post: 'content.edit', put: 'content.edit', del: 'content.edit' },
  { f: 'geofacts/route.ts', get: 'geo.edit', post: 'geo.edit', patch: 'geo.edit', del: 'geo.edit' },
  { f: 'settings/route.ts', get: 'seo.edit', put: 'seo.edit' },
  { f: 'upload/route.ts', post: 'content.edit' },
];

const METHOD_PERM = { get: 'get', post: 'post', put: 'put', patch: 'patch', del: 'del' };

function permOf(rule, method) {
  const key = METHOD_PERM[method];
  return rule[key] || null;
}

/** 把一段鉴权代码替换成 requirePermission 调用 */
function replaceGuard(src, method, perm) {
  // 形式 A: const s = await getSession(); if (!s || s.role !== 'admin') { ... }
  const reA = /const s = await getSession\(\);\s*\n\s*if \(!s \|\| s\.role !== 'admin'\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'forbidden' \}, \{ status: 403 \}\);\s*\n\s*\}/g;
  // 形式 B: await requireAdmin();
  const reB = /await requireAdmin\(\);/g;
  return { src, reA, reB };
}

let changed = [];

for (const rule of RULES) {
  const p = path.join(API, rule.f);
  if (!fs.existsSync(p)) {
    console.log('SKIP (missing):', rule.f);
    continue;
  }
  let src = fs.readFileSync(p, 'utf8');
  const original = src;

  // 1) 局部 requireAdmin 函数定义（brands/[id] 等自带一个）
  const localRequireAdmin = /async function requireAdmin\(\) \{[\s\S]*?\n\}/;
  const hasLocal = localRequireAdmin.test(src);
  if (hasLocal) {
    src = src.replace(localRequireAdmin, '');
  }

  // 2) 逐个 HTTP 方法处理：找到 export async function XXX( 后的第一个鉴权块
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  for (const m of methods) {
    const perm = permOf(rule, m.toLowerCase());
    if (!perm) continue;
    const marker = `export async function ${m}(`;
    const idx = src.indexOf(marker);
    if (idx === -1) continue;
    // 在该方法体内，替换第一个鉴权块
    const bodyStart = idx;
    const nextExport = src.indexOf('\nexport async function', idx + 1);
    const bodyEnd = nextExport === -1 ? src.length : nextExport;
    const body = src.slice(bodyStart, bodyEnd);

    let newBody = body;
    // 形式 A
    newBody = newBody.replace(
      /const s = await getSession\(\);\s*\r?\n\s*if \(!s \|\| s\.role !== 'admin'\) \{\s*\r?\n\s*return NextResponse\.json\(\{ error: 'forbidden' \}, \{ status: 403 \}\);\s*\r?\n\s*\}/,
      `await requirePermission('${perm}');`
    );
    // 形式 B
    newBody = newBody.replace(/await requireAdmin\(\);/, `await requirePermission('${perm}');`);

    if (newBody !== body) {
      src = src.slice(0, bodyStart) + newBody + src.slice(bodyEnd);
    } else {
      console.log('  WARN: no guard replaced in', rule.f, m);
    }
  }

  // 3) 修 import
  if (src.includes('requirePermission(') && !src.includes('requirePermission }') && !/import \{[^}]*requirePermission/.test(src)) {
    if (/import \{ getSession \} from '@\/lib\/auth';/.test(src)) {
      src = src.replace(
        /import \{ getSession \} from '@\/lib\/auth';/,
        "import { getSession, requirePermission } from '@/lib/auth';"
      );
    } else if (/import \{ requireAdmin, HttpError \} from '@\/lib\/auth';/.test(src)) {
      src = src.replace(
        /import \{ requireAdmin, HttpError \} from '@\/lib\/auth';/,
        "import { requirePermission, HttpError } from '@/lib/auth';"
      );
    } else if (/import \{ requireAdmin \} from '@\/lib\/auth';/.test(src)) {
      src = src.replace(
        /import \{ requireAdmin \} from '@\/lib\/auth';/,
        "import { requirePermission } from '@/lib/auth';"
      );
    } else if (/import \{ requireAdmin, getSession, HttpError \} from '@\/lib\/auth';/.test(src)) {
      src = src.replace(
        /import \{ requireAdmin, getSession, HttpError \} from '@\/lib\/auth';/,
        "import { requirePermission, getSession, HttpError } from '@/lib/auth';"
      );
    } else {
      console.log('  WARN: need manual import in', rule.f);
    }
  }
  // 残留 requireAdmin 引用
  if (/\brequireAdmin\b/.test(src)) {
    console.log('  WARN: requireAdmin still referenced in', rule.f);
  }
  // getSession 未使用则保留（很多地方后续还用 s）
  if (src !== original) {
    fs.writeFileSync(p, src, 'utf8');
    changed.push(rule.f);
  }
}

console.log('\nchanged files:', changed.length);
changed.forEach((f) => console.log('  ✓', f));
