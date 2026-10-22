import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const s = await getSession();
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ error: 'bad_input' }, { status: 400 });
    }
    // slug：手填优先，否则按名称生成并保证唯一
    let slug = String(body.slug ?? '').trim();
    if (!slug) {
      slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9가-힣]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'category';
    }
    const exists = await prisma.category.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now().toString(36)}`;

    const category = await prisma.category.create({
      data: {
        slug,
        name,
        nameZh: String(body.nameZh ?? '').trim() || null,
        imageUrl: String(body.imageUrl ?? '').trim() || null,
        sortOrder: Number(body.sortOrder) || 0,
      },
    });
    return NextResponse.json({ ok: true, category });
  } catch (e) {
    console.error('create category error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
