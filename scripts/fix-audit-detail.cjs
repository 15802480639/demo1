// 一次性脚本：修正 attach-audit-logs 生成的 detail 字段（[object Object] → 真实对象）
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 文件 → detail 表达式
const FIX = {
  'products/route.ts': { detail: "{ name: product.name, slug: product.slug, price: product.price }" },
  'products/[id]/route.ts': {
    // PUT 与 DELETE 两个锚点不同，分别处理
    detailPut: "{ name: product.name, slug: product.slug, price: product.price }",
    detailDel: "{ id }",
  },
  'customers/[id]/points/route.ts': { detail: "{ userId: id, amount, remark }" },
  'points/route.ts': { detail: "{ rule }" },
  'coupons/route.ts': { detail: "{ code: coupon.code, type: coupon.type, value: coupon.value }" },
  'support-agents/route.ts': { detail: "{ username: agent.username, displayName: agent.displayName }" },
};

for (const [rel, cfg] of Object.entries(FIX)) {
  const p = path.join(ROOT, 'src/app/api/admin', rel);
  let src = fs.readFileSync(p, 'utf8');
  const before = src;

  if (cfg.detail) {
    src = src.replace(/detail: \{ \[object Object\] \},/g, `detail: ${cfg.detail},`);
  }
  if (cfg.detailPut) {
    // 按出现顺序替换：先 product.update 后 product.delete
    const parts = src.split('detail: { [object Object] },');
    if (parts.length === 3) {
      src =
        parts[0] +
        `detail: ${cfg.detailPut},` +
        parts[1] +
        `detail: ${cfg.detailDel},` +
        parts[2];
    }
  }

  // 清理多余空行（targetType 后那行空的）
  src = src.replace(/targetType: '[a-z]+',\n\s*\n\s*summary:/g, (m) =>
    m.replace(/\n\s*\n/, '\n      ')
  );
  // 修正缩进（生成时锚点替换导致）
  src = src.replace(/^    await logAudit\(\{/gm, '    await logAudit({');

  if (src !== before) {
    fs.writeFileSync(p, src, 'utf8');
    console.log('FIXED', rel);
  } else {
    console.log('no change', rel);
  }
}
