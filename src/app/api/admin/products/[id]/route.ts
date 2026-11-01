import { NextResponse } from 'next/server';
import { HttpError, getSession, requirePermission } from '@/lib/auth';
import { updateProduct, deleteProduct } from '@/lib/services/admin-product-service';
import { logAudit, clientIp, actorFromSession } from '@/lib/audit';
import { apiFail } from '@/lib/api-fail';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission('products.edit');
    const actor = actorFromSession({ ...session, staffRole: session.staffRole ?? 'owner' });
    try {
      const { id } = await params;
      const body = await req.json();
      const product = await updateProduct(id, {
        ...body,
        price: Number(body.price),
        compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : undefined,
      });

      // 商品更新 → 推送该页三语种 URL，让 Bing 系索引及时刷新（静默失败）
      let indexnow: { ok: boolean; error?: string } | null = null;
      try {
        const { pushPaths } = await import('@/lib/indexnow');
        indexnow = await pushPaths([`/products/${product.slug}`]);
      } catch (e) {
        indexnow = { ok: false, error: e instanceof Error ? e.message : 'push failed' };
      }

      // ---- 操作日志 ----
      await logAudit({
        action: 'product.update',
        actor,
        targetType: 'product',
        summary: `상품 수정: ${product.name}`,
        detail: { name: product.name, slug: product.slug, price: product.price },
        ip: clientIp(req),
      });
      return NextResponse.json({ ok: true, product, indexnow });
    } catch (e) {
      console.error('update product error', e);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
  } catch (e) {
    return apiFail(e);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission('products.delete');
    const actor = actorFromSession({ ...session, staffRole: session.staffRole ?? 'owner' });
    const { id } = await params;
    await deleteProduct(id);
    // ---- 操作日志 ----
      await logAudit({
        action: 'product.delete',
        actor,
        targetType: 'product',
        targetId: id,
        summary: `상품 삭제: ${id}`,
        detail: { id },
        ip: clientIp(req),
      });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiFail(e);
  }
}
