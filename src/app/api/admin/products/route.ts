import { NextResponse } from 'next/server';
import { HttpError, getSession, requirePermission } from '@/lib/auth';
import { logAudit, clientIp, actorFromSession } from '@/lib/audit';
import { apiFail } from '@/lib/api-fail';
import {
  getAdminProducts,
  getBrands,
  getCategories,
  createProduct,
} from '@/lib/services/admin-product-service';

export async function GET() {
  try {
    await requirePermission('products.view');
    const [products, brands, categories] = await Promise.all([
      getAdminProducts(),
      getBrands(),
      getCategories(),
    ]);
    return NextResponse.json({ products, brands, categories });
  } catch (e) {
    return apiFail(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requirePermission('products.edit');
    const actor = actorFromSession({ ...session, staffRole: session.staffRole ?? 'owner' });
    try {
      const body = await req.json();
      if (!body.name || !body.categoryId || !(Number(body.price) > 0)) {
        return NextResponse.json({ error: 'bad_input' }, { status: 400 });
      }
      const product = await createProduct({
        ...body,
        price: Number(body.price),
        compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : undefined,
      });

      // 新商品上线 → 立即推送 IndexNow，让 Bing 系（含 ChatGPT 检索）尽快重抓。
      // 🔴 必须静默：推送失败绝不能影响建品流程（记忆库 §3.5）
      let indexnow: { ok: boolean; error?: string } | null = null;
      try {
        const { pushPaths } = await import('@/lib/indexnow');
        indexnow = await pushPaths([`/products/${product.slug}`]);
      } catch (e) {
        indexnow = { ok: false, error: e instanceof Error ? e.message : 'push failed' };
      }

      // ---- 操作日志 ----
      await logAudit({
        action: 'product.create',
        actor,
        targetType: 'product',
        summary: `상품 신규 등록: ${product.name}`,
        detail: { name: product.name, slug: product.slug, price: product.price },
        ip: clientIp(req),
      });
      return NextResponse.json({ ok: true, product, indexnow });
    } catch (e) {
      console.error('create product error', e);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
  } catch (e) {
    return apiFail(e);
  }
}
