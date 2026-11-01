// 一次性脚本：给后台写接口接入操作日志
// ⚠️ 一次性脚本，执行后即可删除。
//
// 只处理"在返回值前插入 logAudit 调用"这种机械改动，
// 复杂的分支判断（订单接口）已手工改完，不在这里处理。

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/**
 * 每项：
 *   file      相对 src/app/api/admin 的路径
 *   method    HTTP 方法
 *   perm      权限点（用于把 requirePermission(...) 改成带 session 的形式）
 *   action    审计动作
 *   targetType
 *   summary   模板函数（接收 vars）
 *   detail    模板
 *   anchor    插入锚点：在哪一行之前插入
 */
const JOBS = [
  {
    file: 'products/route.ts',
    method: 'POST',
    perm: 'products.edit',
    action: 'product.create',
    targetType: 'product',
    anchor: 'return NextResponse.json({ ok: true, product, indexnow });',
    summary: () => `상품 신규 등록: ${'{name}'}`,
    vars: ['name'],
    detail: () => ({ name: '{name}', slug: '{slug}', price: '{price}' }),
  },
  {
    file: 'products/[id]/route.ts',
    method: 'PUT',
    perm: 'products.edit',
    action: 'product.update',
    targetType: 'product',
    anchor: 'return NextResponse.json({ ok: true, product, indexnow });',
    summary: () => `상품 수정: ${'{name}'}`,
    vars: ['name'],
    detail: () => ({ name: '{name}', slug: '{slug}', price: '{price}' }),
  },
  {
    file: 'products/[id]/route.ts',
    method: 'DELETE',
    perm: 'products.delete',
    action: 'product.delete',
    targetType: 'product',
    anchor: 'return NextResponse.json({ ok: true });',
    summary: () => `상품 삭제: ${'{id}'}`,
    vars: ['id'],
    detail: () => ({ id: '{id}' }),
  },
  {
    file: 'customers/[id]/points/route.ts',
    method: 'POST',
    perm: 'customers.points',
    action: 'customer.points.adjust',
    targetType: 'customer',
    anchor: 'return NextResponse.json({ ok: true, ...result });',
    summary: () => `회원 적립금 조정: ${'{id}'} (${'{amount}'}점)`,
    vars: ['id', 'amount'],
    detail: () => ({ userId: '{id}', amount: '{amount}', remark: '{remark}' }),
  },
  {
    file: 'points/route.ts',
    method: 'PUT',
    perm: 'points.manage',
    action: 'points.rule.update',
    targetType: 'setting',
    anchor: 'return NextResponse.json({ ok: true, rule });',
    summary: () => '적립 규칙 변경',
    vars: [],
    detail: () => ({ rule: '{rule}' }),
  },
  {
    file: 'coupons/route.ts',
    method: 'POST',
    perm: 'coupons.edit',
    action: 'coupon.create',
    targetType: 'coupon',
    anchor: 'return NextResponse.json({ coupon });',
    summary: () => `쿠폰 생성: ${'{code}'}`,
    vars: ['code'],
    detail: () => ({ code: '{code}', type: '{type}', value: '{value}' }),
  },
  {
    file: 'support-agents/route.ts',
    method: 'POST',
    perm: 'agents.manage',
    action: 'agent.create',
    targetType: 'agent',
    anchor: 'return NextResponse.json({\n    ok: true,\n    agent: { ...agent, createdAt: agent.createdAt.toISOString() },\n  });',
    summary: () => `상담원 계정 생성: ${'{username}'}`,
    vars: ['username'],
    detail: () => ({ username: '{username}', displayName: '{displayName}' }),
  },
];

// 把 requirePermission('x') 改成 const session = await requirePermission('x'); const actor = ...
function ensureActor(src, perm) {
  const re = new RegExp(`await requirePermission\\('${perm}'\\);`);
  if (!re.test(src)) return null;
  return src.replace(
    re,
    `const session = await requirePermission('${perm}');\n  const actor = actorFromSession({ ...session, staffRole: session.staffRole ?? 'owner' });`
  );
}

function ensureImports(src) {
  let s = src;
  if (!/from '@\/lib\/audit'/.test(s)) {
    // 插到最后一个 import 语句之后（支持多行 import）
    const lines = s.split('\n');
    let lastImport = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^import\b/.test(lines[i])) {
        // 多行 import：找到以 ; 结尾的那一行
        let j = i;
        while (j < lines.length && !/;\s*$/.test(lines[j]) && !/^import\b/.test(lines[j + 1] ?? '')) {
          j++;
          if (j - i > 12) break;
        }
        lastImport = j;
        i = j;
      }
    }
    if (lastImport === -1) throw new Error('no import found');
    lines.splice(
      lastImport + 1,
      0,
      "import { logAudit, clientIp, actorFromSession } from '@/lib/audit';"
    );
    s = lines.join('\n');
  }
  return s;
}

for (const job of JOBS) {
  const p = path.join(ROOT, 'src/app/api/admin', job.file);
  let src = fs.readFileSync(p, 'utf8');

  // 只在该方法内操作：定位方法起点与下一个 export 之间
  const marker = `export async function ${job.method}(`;
  const idx = src.indexOf(marker);
  if (idx === -1) {
    console.log('SKIP (no method)', job.file, job.method);
    continue;
  }
  const nextExport = src.indexOf('\nexport async function', idx + 1);
  const bodyEnd = nextExport === -1 ? src.length : nextExport;
  let body = src.slice(idx, bodyEnd);

  if (body.includes('logAudit({')) {
    console.log('SKIP (already has logAudit)', job.file, job.method);
    continue;
  }
  if (!body.includes(job.anchor)) {
    console.log('SKIP (anchor not found)', job.file, job.method, '→', job.anchor.slice(0, 40));
    continue;
  }

  // 1) actor
  const withActor = ensureActor(body, job.perm);
  if (withActor) body = withActor;

  // 2) 构造 logAudit 调用
  const vars = (job.vars || []).map((v) => `      ${v}: ${v},`).join('\n');
  const detailExpr = job.detail()
    .toString()
    .replace(/\{(\w+)\}/g, (_m, k) => `\${${k}}`);
  const summaryExpr = job.summary()
    .toString()
    .replace(/\{(\w+)\}/g, (_m, k) => `\${${k}}`);

  const call = `    // ---- 操作日志 ----
    await logAudit({
      action: '${job.action}',
      actor,
      targetType: '${job.targetType}',
      ${job.targetIdField ? `targetId: ${job.targetIdField},` : ''}
      summary: \`${summaryExpr}\`,
      detail: { ${detailExpr} },
      ip: clientIp(req),
    });

`;

  body = body.replace(job.anchor, call + job.anchor);

  src = src.slice(0, idx) + body + src.slice(bodyEnd);
  src = ensureImports(src);

  fs.writeFileSync(p, src, 'utf8');
  console.log('OK', job.file, job.method, '→', job.action);
}
