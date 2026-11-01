import { NextResponse } from 'next/server';
import { requirePermission, HttpError } from '@/lib/auth';
import { parseProductWorkbook, importProducts, buildImportTemplate } from '@/lib/excel-import';
import { logAudit, clientIp, actorFromSession } from '@/lib/audit';

// POST /api/admin/products/import —— 上传 Excel 批量导入商品
// body: multipart/form-data { file: File, dryRun?: '1' }
export async function POST(req: Request) {
  let actor: ReturnType<typeof actorFromSession> = null;
  try {
    const s = await requirePermission('products.import');
    actor = actorFromSession({ ...s, staffRole: s.staffRole ?? 'owner' });

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file_required' }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'file_too_large' }, { status: 400 });
    }
    const dryRun = form.get('dryRun') === '1' || form.get('dryRun') === 'true';

    const buf = Buffer.from(await file.arrayBuffer());
    const { rows, errors } = await parseProductWorkbook(buf);
    if (errors.length && rows.length === 0) {
      return NextResponse.json({ error: 'parse_failed', errors }, { status: 400 });
    }

    const result = await importProducts(rows, { dryRun });

    // 解析阶段的问题也一并回报（不阻断）
    const allErrors = [
      ...errors.map((m) => ({ row: 0, message: m })),
      ...result.errors,
    ];
    const final = { ...result, errors: allErrors };

    // 操作日志（试运行也记，便于追溯谁试过什么）
    await logAudit({
      action: 'product.import',
      actor,
      targetType: 'product',
      summary: `Excel 导入 ${final.total} 行 → 新建 ${final.created} / 更新 ${final.updated} / 失败 ${final.failed}${dryRun ? '（试运行）' : ''}`,
      detail: {
        file: file.name,
        dryRun,
        total: final.total,
        created: final.created,
        updated: final.updated,
        failed: final.failed,
      },
      ip: clientIp(req),
    });

    return NextResponse.json(final);
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error('[product.import] error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

// GET /api/admin/products/import —— 下载导入模板
export async function GET() {
  try {
    await requirePermission('products.import');
    const buf = await buildImportTemplate();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="webshopp-product-import-template.xlsx"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error('[product.import.template] error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
