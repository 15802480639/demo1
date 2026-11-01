// Excel 批量导入商品 —— 解析、校验、落库
//
// ⭐ 为什么不用 CSV：
//   用户明确要「Excel 批量上传」，且运营给的多半是 .xlsx。
//   exceljs 同时支持读写 xlsx，导出功能也能复用（见 excel-export.ts）。
//
// ⭐ 导入语义（重要，避免运营误操作）：
//   - 按 slug 匹配：存在 → 更新（改价格/库存/基本信息）；不存在 → 新建
//   - 颜色/尺码非空 → 自动生成/更新 SKU 组合；同一商品同一选项的多行合并为一个 SKU
//   - 库存是「设置值」而非「增量」：填 10 就是改成 10（符合运营改库存的直觉）
//   - 未填写的列一律「不改」（不是清空），避免漏填导致数据被抹掉
//   - 支持试运行（dryRun）：只校验不写库，先给运营看结果
//
// ⚠️ 安全：所有错误必须逐行收集并回报，不能因为一行错就整批失败。

import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import { createProduct, updateProduct } from '@/lib/services/admin-product-service';

export type ImportRow = {
  rowNumber: number;
  name?: string;
  slug?: string;
  code?: string;
  price?: number;
  compareAtPrice?: number;
  stock?: number;
  color?: string;
  size?: string;
  skuCode?: string;
  category?: string;
  brand?: string;
  status?: string;
  gender?: string;
};

export type ImportResult = {
  ok: boolean;
  dryRun: boolean;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: { row: number; message: string; name?: string }[];
  summary: string;
};

/**
 * 表头别名 → 标准字段（中英韩都支持，降低运营填错表头的概率）
 *
 * ⚠️ 键名会被 normHeader() 做 trim + lowercase，所以
 *    '상품명' 与 상품명 等价，不要重复写两遍（TS 会报重复键）。
 *    含空格的英文别名（'product name'）需保留引号。
 */
const HEADER_ALIASES: Record<string, keyof ImportRow> = {
  // 名称
  name: 'name',
  상품명: 'name',
  productname: 'name',
  'product name': 'name',
  名称: 'name',
  商品名: 'name',
  // slug
  slug: 'slug',
  슬러그: 'slug',
  url: 'slug',
  // 货号
  code: 'code',
  sku: 'code',
  품번: 'code',
  'item code': 'code',
  货号: 'code',
  编号: 'code',
  // 价格
  price: 'price',
  가격: 'price',
  priceprice: 'price',
  'price (krw)': 'price',
  가격원: 'price',
  价格: 'price',
  售价: 'price',
  // 划线价
  compareatprice: 'compareAtPrice',
  'compare at price': 'compareAtPrice',
  비교가: 'compareAtPrice',
  划线价: 'compareAtPrice',
  原价: 'compareAtPrice',
  // 库存
  stock: 'stock',
  재고: 'stock',
  quantity: 'stock',
  qty: 'stock',
  库存: 'stock',
  数量: 'stock',
  // 颜色
  color: 'color',
  색상: 'color',
  col: 'color',
  颜色: 'color',
  // 尺码
  size: 'size',
  사이즈: 'size',
  尺码: 'size',
  尺寸: 'size',
  // SKU 编码
  skucode: 'skuCode',
  'sku code': 'skuCode',
  // 分类
  category: 'category',
  categoryslug: 'category',
  카테고리: 'category',
  分类: 'category',
  // 品牌
  brand: 'brand',
  brandslug: 'brand',
  브랜드: 'brand',
  品牌: 'brand',
  // 状态
  status: 'status',
  상태: 'status',
  状态: 'status',
  // 性别
  gender: 'gender',
  성별: 'gender',
  性别: 'gender',
};

function normHeader(h: unknown): string {
  return String(h ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** 单元格取值：兼容 ExcelJS 的各种值类型 */
function cellText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date) return v.toISOString();
  // 富文本 / 超链接
  const anyV = v as any;
  if (anyV.richText) return anyV.richText.map((r: any) => r.text).join('').trim();
  if (anyV.text) return String(anyV.text).trim();
  if (anyV.result !== undefined) return String(anyV.result).trim();
  if (anyV.hyperlink) return String(anyV.text ?? anyV.hyperlink).trim();
  return String(v).trim();
}

function toNumber(s: string): number | undefined {
  if (!s) return undefined;
  // 去掉 ₩ / 逗号 / 空格
  const cleaned = s.replace(/[₩,¥\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/** 解析 Excel Buffer → 行数据 */
export async function parseProductWorkbook(
  buf: Buffer
): Promise<{ rows: ImportRow[]; errors: string[] }> {
  const errors: string[] = [];
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as any);

  const ws = wb.worksheets[0];
  if (!ws) return { rows: [], errors: ['엑셀 파일에 시트가 없습니다 / 文件中没有工作表'] };

  // 表头行：取第一行
  const headerRow = ws.getRow(1);
  const map = new Map<number, keyof ImportRow>();
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    const key = HEADER_ALIASES[normHeader(cellText(cell.value))];
    if (key && !map.has(col)) map.set(col, key);
  });

  if (!map.has(0) && map.size === 0) {
    errors.push(
      '표头行(첫 행)을 인식하지 못했습니다. 최소한 상품명/가격/재고 열이 필요합니다. / 未识别表头，至少需要 商品名/价格/库存 列'
    );
    return { rows: [], errors };
  }

  const rows: ImportRow[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const obj: ImportRow = { rowNumber: r };
    let any = false;
    map.forEach((key, col) => {
      const raw = cellText(row.getCell(col).value);
      if (raw === '') return;
      any = true;
      if (key === 'price' || key === 'compareAtPrice' || key === 'stock') {
        const n = toNumber(raw);
        if (n === undefined) {
          errors.push(`행 ${r}: 숫자가 아닌 값 '${raw}' / ${key}`);
        } else {
          obj[key] = n;
        }
      } else {
        (obj as any)[key] = raw;
      }
    });
    // 完全空行跳过
    if (!any) continue;
    rows.push(obj);
  }

  return { rows, errors };
}

/** 生成导入结果骨架 */
function emptyResult(dryRun: boolean): ImportResult {
  return {
    ok: true,
    dryRun,
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    summary: '',
  };
}

/**
 * 执行导入。
 * @param rows 解析后的行
 * @param dryRun true = 只校验不写库
 */
export async function importProducts(
  rows: ImportRow[],
  opts: { dryRun?: boolean } = {}
): Promise<ImportResult> {
  const dryRun = !!opts.dryRun;
  const res = emptyResult(dryRun);
  res.total = rows.length;

  // 缓存分类/品牌：slug → id
  const categories = await prisma.category.findMany();
  const catBySlug = new Map<string, (typeof categories)[number]>(
    categories.map((c) => [c.slug, c])
  );
  const catByName = new Map<string, (typeof categories)[number]>(
    categories.map((c) => [c.name, c])
  );
  const catByNameZh = new Map<string, (typeof categories)[number]>(
    categories.filter((c) => c.nameZh).map((c) => [c.nameZh as string, c])
  );

  const brands = await prisma.brand.findMany();
  const brandBySlug = new Map<string, (typeof brands)[number]>(
    brands.map((b) => [b.slug, b])
  );
  const brandByName = new Map<string, (typeof brands)[number]>(
    brands.map((b) => [b.name, b])
  );

  // 按 slug 分组：一行一个 SKU
  const groups = new Map<string, ImportRow[]>();
  const noSlugRows: ImportRow[] = [];

  for (const r of rows) {
    const key = (r.slug || r.code || r.name || '').trim();
    if (!key) {
      res.failed++;
      res.errors.push({ row: r.rowNumber, message: '슬러그/품번/상품명 중 하나는 반드시 있어야 합니다 / slug、货号、商品名至少填一项' });
      continue;
    }
    const g = groups.get(key) ?? [];
    g.push(r);
    groups.set(key, g);
  }

  for (const [key, groupRows] of groups) {
    const first = groupRows[0];
    try {
      // ---- 校验 ----
      if (!first.name && !first.slug) {
        res.failed++;
        res.errors.push({ row: first.rowNumber, message: '상품명이 없습니다 / 缺少商品名', name: first.name });
        continue;
      }
      const price = first.price;
      if (price === undefined && !first.slug) {
        // 新建必须有价格；更新时价格可留空（保持原价）
        res.failed++;
        res.errors.push({ row: first.rowNumber, message: '신규 등록에는 가격이 필요합니다 / 新建商品必须填价格', name: first.name });
        continue;
      }
      if (price !== undefined && price <= 0) {
        res.failed++;
        res.errors.push({ row: first.rowNumber, message: '가격은 0보다 커야 합니다 / 价格必须大于 0', name: first.name });
        continue;
      }

      // 分类：新建必须有
      let categoryId: string | undefined;
      if (first.category) {
        const c =
          catBySlug.get(first.category) ??
          catByName.get(first.category) ??
          catByNameZh.get(first.category);
        if (c) categoryId = c.id;
        else {
          res.failed++;
          res.errors.push({ row: first.rowNumber, message: `분류를 찾을 수 없습니다: ${first.category} / 找不到分类：${first.category}`, name: first.name });
          continue;
        }
      }

      let brandId: string | undefined;
      if (first.brand) {
        const b = brandBySlug.get(first.brand) ?? brandByName.get(first.brand);
        if (b) brandId = b.id;
        else {
          res.failed++;
          res.errors.push({ row: first.rowNumber, message: `브랜드를 찾을 수 없습니다: ${first.brand} / 找不到品牌：${first.brand}`, name: first.name });
          continue;
        }
      }

      const existing = first.slug
        ? await prisma.product.findUnique({
            where: { slug: first.slug },
            include: { skus: true, specs: true },
          })
        : null;

      // ---- 组装 SKU：同商品不同选项 → 不同 SKU ----
      const skuInputs = groupRows
        .filter((r) => r.color || r.size)
        .map((r) => ({
          options: {
            ...(r.color ? { Color: r.color } : {}),
            ...(r.size ? { Size: r.size } : {}),
          },
          stock: r.stock ?? 0,
          price: r.price,
        }));

      if (dryRun) {
        if (existing) res.updated++;
        else res.created++;
        continue;
      }

      if (existing) {
        // ---- 更新 ----
        const skus = skuInputs.length
          ? [
              ...existing.skus.map((s) => ({
                id: s.id,
                options: parseOptions(s.options),
                stock: s.stock,
                price: s.price ?? undefined,
              })),
              ...skuInputs.map((s) => ({ ...s, options: s.options })),
            ]
          : undefined;

        // 同选项的旧 SKU 若出现在导入表里，用新库存覆盖
        if (skuInputs.length && existing.skus.length) {
          for (const s of skuInputs) {
            const hit = existing.skus.find(
              (old) => sameOptions(parseOptions(old.options), s.options)
            );
            if (hit) {
              const idx = skus!.findIndex((x) => x.id === hit.id);
              if (idx >= 0) {
                skus![idx] = {
                  id: hit.id,
                  options: s.options,
                  stock: s.stock,
                  price: s.price ?? hit.price ?? undefined,
                };
              }
            }
          }
        }

        await updateProduct(existing.id, {
          name: first.name ?? existing.name,
          nameZh: first.name ?? existing.nameZh ?? undefined,
          code: first.code ?? existing.code ?? undefined,
          description: existing.description ?? undefined,
          descriptionZh: existing.descriptionZh ?? undefined,
          gender: first.gender ?? existing.gender ?? undefined,
          brandId: brandId ?? existing.brandId ?? undefined,
          categoryId: categoryId ?? existing.categoryId,
          price: price ?? existing.price,
          compareAtPrice: first.compareAtPrice ?? existing.compareAtPrice ?? undefined,
          status: first.status ?? existing.status,
          images: existing.images ? (JSON.parse(existing.images) as string[]) : [],
          skus,
        });
        res.updated++;
      } else {
        // ---- 新建 ----
        if (!categoryId) {
          res.failed++;
          res.errors.push({ row: first.rowNumber, message: '신규 등록에는 분류가 필요합니다 / 新建商品必须填分类', name: first.name });
          continue;
        }
        await createProduct({
          name: first.name!,
          nameZh: first.name,
          code: first.code,
          description: '',
          gender: first.gender,
          brandId,
          categoryId,
          price: price!,
          compareAtPrice: first.compareAtPrice,
          status: first.status || 'draft',
          images: [],
          // ⚠️ 必须把 Excel 里填的 slug 传下去，否则第二次导入同一 slug 会新建重复商品
          slug: first.slug,
          skus: skuInputs.length
            ? skuInputs.map((s) => ({
                options: s.options,
                stock: s.stock,
                price: s.price,
              }))
            : [
                {
                  options: {},
                  stock: first.stock ?? 0,
                  price: price,
                },
              ],
          specs: [],
        });
        res.created++;
      }
    } catch (e) {
      res.failed++;
      res.errors.push({
        row: first.rowNumber,
        message: e instanceof Error ? e.message.slice(0, 200) : 'unknown error',
        name: first.name,
      });
    }
  }

  res.ok = res.failed === 0;
  res.summary = `총 ${res.total}건 중 신규 ${res.created}, 수정 ${res.updated}, 실패 ${res.failed}${
    dryRun ? ' (미리보기)' : ''
  }`;
  return res;
}

function parseOptions(s: string | null): Record<string, string> {
  if (!s) return {};
  try {
    const v = JSON.parse(s);
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

function sameOptions(a: Record<string, string>, b: Record<string, string>): boolean {
  const ka = Object.keys(a).sort().join('|');
  const kb = Object.keys(b).sort().join('|');
  if (ka !== kb) return false;
  return Object.keys(a).every((k) => a[k] === b[k]);
}

/** 生成导入模板（xlsx Buffer） */
export async function buildImportTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('products');
  ws.columns = [
    { header: '상품명', key: 'name', width: 30 },
    { header: '슬러그', key: 'slug', width: 24 },
    { header: '품번', key: 'code', width: 16 },
    { header: '가격', key: 'price', width: 14 },
    { header: '재고', key: 'stock', width: 10 },
    { header: '색상', key: 'color', width: 14 },
    { header: '사이즈', key: 'size', width: 12 },
    { header: '카테고리', key: 'category', width: 16 },
    { header: '브랜드', key: 'brand', width: 16 },
    { header: '상태', key: 'status', width: 12 },
    { header: '성별', key: 'gender', width: 10 },
  ];
  // 示例行
  ws.addRow(['겨울 자켓', 'winter-jacket', 'JD-001', 189000, 10, '블랙', 'M', 'men', 'j-d', 'active', 'men']);
  ws.addRow(['겨울 자켓', 'winter-jacket', 'JD-001', 189000, 6, '블랙', 'L', 'men', 'j-d', 'active', 'men']);
  ws.addRow(['겨울 자켓', 'winter-jacket', 'JD-001', 189000, 8, '화이트', 'M', 'men', 'j-d', 'active', 'men']);

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
