// MKGOLF 商品抓取 → 本地图片 + JSON
// 用法:
//   node scripts/scrape-mkgolf.mjs            # 仅预览，输出 JSON 到 stdout 并写 scraped-data.json
//   DOWNLOAD=1 node scripts/scrape-mkgolf.mjs  # 预览 + 下载图片到 public/uploads
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const UPLOAD_DIR = join(ROOT, 'public', 'uploads');
const OUT_JSON = join(ROOT, 'prisma', 'scraped-data.json');
const BASE = 'https://www.mk.golf';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const DO_DOWNLOAD = process.env.DOWNLOAD === '1';

const CATS = [
  { slug: 'padded', url: BASE + '/product-category/padded/', name: 'Padded' },
  { slug: 'onepiece', url: BASE + '/product-category/onepiece/', name: 'Onepiece' },
  { slug: 'belt', url: BASE + '/product-category/acc/belt/', name: 'Belt' },
  { slug: 'bag', url: BASE + '/product-category/acc/bag/', name: 'Bag' },
  { slug: 'ball-case', url: BASE + '/product-category/acc/ball-case/', name: 'Ball Case' },
  { slug: 'sale', url: BASE + '/product-category/sale/', name: 'Sale' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decodeEntities(s) {
  return s
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,en;q=0.8' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function parseCategory(html, catSlug) {
  const cards = [];
  // 商品卡片：<div class="wpex-post-cards-entry ... type-product ...">  （内部含 swatch 的 <li>，故按起始位置切片）
  const re = /<div[^>]*class="[^"]*wpex-post-cards-entry[^"]*"[^>]*>/g;
  const starts = [];
  let m;
  while ((m = re.exec(html)) !== null) starts.push(m.index);
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : html.length;
    const card = html.slice(start, end);

    const slugM = card.match(/href="https:\/\/www\.mk\.golf\/product\/([^"/]+)\//);
    if (!slugM) continue;
    const slug = slugM[1];

    const nameM = card.match(/woocommerce-loop-product__title">([^<]+)/);
    if (!nameM) continue;
    const name = decodeEntities(nameM[1]);

    const priceM = card.match(/8361;?[^0-9]*([0-9,]+)/);
    const price = priceM ? parseInt(priceM[1].replace(/,/g, ''), 10) : 0;

    const imgM = card.match(/<img[^>]+?(?:src|data-src|data-lazy-src)="([^"]*wp-content\/uploads\/202\d\/[^"]*\.(?:webp|jpg|jpeg|png))"/);
    let image = imgM ? imgM[1] : '';
    if (image.startsWith('//')) image = 'https:' + image;
    if (image.startsWith('/')) image = BASE + image;

    const codeM = card.match(/>([A-Z]{2,4}-?[A-Z0-9]*\d[A-Z0-9]*)<\/span>/);
    const code = codeM ? codeM[1] : '';

    let gender = 'unisex';
    if (/WOMEN|WOMAN/.test(name)) gender = 'women';
    else if (/MEN|MAN/.test(name)) gender = 'men';

    cards.push({ slug, name, code, price, image, gender, categorySlug: catSlug });
  }
  return cards;
}

async function downloadImage(url, fileBase) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Referer': BASE + '/' } });
    if (!res.ok) {
      console.error(`  ! ${res.status} ${url}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = /\.png/i.test(url) ? 'png' : /\.jpe?g/i.test(url) ? 'jpg' : 'webp';
    const file = join(UPLOAD_DIR, `${fileBase}.${ext}`);
    writeFileSync(file, buf);
    return `/uploads/${fileBase}.${ext}`;
  } catch (e) {
    console.error(`  ! download error ${url}: ${e.message}`);
    return null;
  }
}

async function main() {
  const bySlug = new Map();
  const categories = [];
  for (const cat of CATS) {
    process.stdout.write(`fetching ${cat.slug} ... `);
    let html;
    try {
      html = await fetchText(cat.url);
    } catch (e) {
      console.log('FAILED', e.message);
      continue;
    }
    const cards = parseCategory(html, cat.slug);
    console.log(`${cards.length} products`);
    categories.push({ slug: cat.slug, name: cat.name });
    for (const c of cards) {
      if (!bySlug.has(c.slug)) bySlug.set(c.slug, c);
    }
    await sleep(400);
  }

  const products = [...bySlug.values()];
  const data = { categories, brand: 'MKGOLF', products };
  writeFileSync(OUT_JSON, JSON.stringify(data, null, 2));
  console.log(`\nTOTAL unique products: ${products.length}  across ${categories.length} categories`);
  console.log('sample:', JSON.stringify(products.slice(0, 4), null, 2));

  if (DO_DOWNLOAD) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
    let ok = 0, fail = 0;
    for (const p of products) {
      const local = await downloadImage(p.image, `mk-${p.slug}`);
      if (local) { p.image = local; p.images = [local]; ok++; }
      else { p.images = p.image ? [p.image] : []; fail++; }
      await sleep(150);
    }
    console.log(`\nDOWNLOAD done: ${ok} ok, ${fail} fail`);
    writeFileSync(OUT_JSON, JSON.stringify(data, null, 2));
  } else {
    console.log('\n(preview only — set DOWNLOAD=1 to fetch images)');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
