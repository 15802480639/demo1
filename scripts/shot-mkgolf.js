const { chromium } = require('C:/Users/Administrator/.workbuddy/binaries/node/workspace/node_modules/playwright');

(async () => {
  const urls = [
    { name: 'home', url: 'https://www.mk.golf/' },
    { name: 'listing', url: 'https://www.mk.golf/man/t-shirts/' },
    { name: 'product', url: 'https://www.mk.golf/product/26summer-longsleeve-polo-men-white/' },
  ];
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
  });
  const out = 'D:/LuoshenWorkspace/code/webshopp/scripts/shots';
  require('fs').mkdirSync(out, { recursive: true });
  for (const item of urls) {
    const page = await ctx.newPage();
    try {
      await page.goto(item.url, { waitUntil: 'networkidle', timeout: 45000 });
    } catch (e) {
      console.log('goto warn', item.name, e.message);
    }
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}/${item.name}-full.png`, fullPage: true });
    await page.screenshot({ path: `${out}/${item.name}-top.png`, fullPage: false });
    console.log('shot done:', item.name);
    await page.close();
  }
  await browser.close();
  console.log('ALL_DONE');
})();
