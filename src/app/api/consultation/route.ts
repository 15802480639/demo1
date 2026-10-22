import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, getSession, HttpError } from '@/lib/auth';

/**
 * Kakao 咨询记录 API
 *
 * 背景：用户点「Kakao 咨询购买」跳转到 Kakao 时，属于纯 `<a href>` 跳转，
 * Kakao 侧不会携带任何商品信息 —— 客服只知道"有人来消息"，不知道对方问的什么。
 * 因此在跳转前先由本站写一条快照记录，客服在后台就能看到
 * 商品名 / 规格 / 价格 / 访客语言 / 来源页，并可一键复制回复模板粘到 Kakao。
 */

/** 简易限流：单实例内存计数，同一 IP 60 秒内最多 10 条（防刷屏，非强安全边界） */
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear(); // 防长期运行内存无限增长
  return false;
}

const clip = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

/** 前台提交：公开接口（未登录也能咨询），只写一条快照 */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'TOO_MANY' }, { status: 429 });
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID' }, { status: 400 });
  }

  const productName = clip(b.productName, 200);
  const price = Number(b.price);
  if (!productName || !Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: 'INVALID' }, { status: 400 });
  }

  const locale = clip(b.locale, 8) || 'ko';
  const session = await getSession().catch(() => null);

  try {
    const row = await prisma.consultation.create({
      data: {
        productId: clip(b.productId, 64) || null,
        productName,
        productSlug: clip(b.productSlug, 200) || null,
        skuLabel: clip(b.skuLabel, 200) || null,
        price: Math.round(price),
        locale,
        userId: session?.id ?? null,
        sourcePage: clip(b.sourcePage, 300) || null,
      },
    });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    // 写库失败不能阻断跳转（用户仍要去 Kakao），只记日志
    console.error('[consultation] create failed:', e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

/**
 * requireAdmin() 抛的 HttpError 必须在这里转成对应状态码。
 * 不接的话Next.js 会把任何 throw 都兜成 **500**，
 * 未登录访问后台接口看着像"服务器炸了"，实际只是没登录 —— 极难排查。
 */
function authFail(e: unknown): NextResponse | null {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return null;
}

/** 后台列表：支持 status 筛选与分页 */
export async function GET(req: NextRequest) {
  let rows, counts;
  try {
    await requireAdmin();
    const sp = req.nextUrl.searchParams;
    const status = sp.get('status');
    const limit = Math.min(Number(sp.get('limit')) || 100, 500);

    rows = await prisma.consultation.findMany({
      where: status && status !== 'all' ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    counts = await prisma.consultation.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
  } catch (e) {
    const fail = authFail(e);
    if (fail) return fail;
    console.error('[consultation] list failed:', e);
    return NextResponse.json({ error: 'SERVER' }, { status: 500 });
  }
  return NextResponse.json({ rows, counts });
}

/** 后台改状态 / 备注 */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    const fail = authFail(e);
    if (fail) return fail;
    throw e;
  }

  const b = await req.json();
  const id = clip(b.id, 64);
  const status = clip(b.status, 20);
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 2000) : undefined;
  if (!id) return NextResponse.json({ error: 'INVALID' }, { status: 400 });
  if (!['new', 'contacted', 'closed'].includes(status)) {
    return NextResponse.json({ error: 'INVALID' }, { status: 400 });
  }
  await prisma.consultation.update({
    where: { id },
    data: { status, ...(note !== undefined ? { note } : {}) },
  });
  return NextResponse.json({ ok: true });
}