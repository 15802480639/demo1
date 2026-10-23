/** 全站 URL 回归巡检：前台三语种关键路径 + SEO 输出文件 + 后台页。 */
const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const urls = [
  // 三语种首页
  ['/ko', 200], ['/zh', 200], ['/en', 200],
  // 商品列表/详情
  ['/zh/products', 200], ['/ko/products', 200], ['/en/products', 200],
  ['/zh/products/26padded-jacket-khaki', 200],
  ['/ko/products/26padded-jacket-khaki', 200],
  ['/en/products/26padded-jacket-khaki', 200],
  ['/zh/products/women-urbgan-swinger-down-jacket-black', 200],
  // 分类
  ['/zh/c/bag', 200], ['/zh/c/belt', 200], ['/ko/c/bag', 200],
  // 品牌/搜索/静态页
  ['/zh/brands', 200], ['/zh/search?q=jacket', 200], ['/zh/faq', 200], ['/ko/faq', 200], ['/en/faq', 200],
  ['/zh/cart', 200], ['/zh/login', 200], ['/zh/register', 200],
  ['/zh/info/shipping', 200], ['/zh/info/returns', 200],
  // SEO 输出（GEO 资产，一个都不能挂）
  ['/llms.txt', 200], ['/llms-full.txt', 200], ['/robots.txt', 200], ['/sitemap.xml', 200],
  // 不存在的路径应 404（软404修复后也应是真404）
  ['/zh/products/no-such-product-xyz', 404],
  ['/zh/c/no-such-category-xyz', 404],
];

(async () => {
  let pass = 0, fail = 0;
  console.log(`\n===== 全站 URL 巡检 @ ${BASE} =====\n`);
  for (const [path, expect] of urls) {
    try {
      const res = await fetch(BASE + path, { redirect: 'manual' });
      const ok = res.status === expect || (expect === 200 && res.status >= 200 && res.status < 400);
      if (ok) pass++; else fail++;
      console.log(`${ok ? '✅' : '❌'} ${String(res.status).padEnd(3)} ${path}${ok ? '' : `（期望${expect}）`}`);
    } catch (e) {
      fail++;
      console.log(`❌ ERR ${path} — ${e.message}`);
    }
  }
  // llms.txt 内容健全性（75条链接、无占位符电话）
  const llms = await (await fetch(BASE + '/llms.txt')).text();
  const linkCount = (llms.match(/https?:\/\/[^\s)\]]+/g) || []).length;
  const hasPlaceholder = llms.includes('—') && /(tel|address|CEO)[^\n]*—/i.test(llms);
  const noNan = !llms.includes('NaN') && !llms.includes('[object Object]') && !llms.includes('undefined');
  console.log(`\nllms.txt：${llms.split('\n').length} 行 / ${linkCount} 条链接 / 占位符泄漏=${hasPlaceholder ? '❌有' : '✅无'} / 脏值=${noNan ? '✅无' : '❌有'}`);
  if (hasPlaceholder || !noNan) fail++;
  console.log(`\n===== 巡检结果：${pass} 通过 / ${fail} 失败 =====`);
  process.exit(fail ? 1 : 0);
})();
