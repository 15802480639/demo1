import { NextResponse } from 'next/server';
import { HttpError, getSession, requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiFail } from '@/lib/api-fail';

export async function GET() {
  try {
    await requirePermission('products.view');
    const brands = await prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({ brands });
  } catch (e) {
    return apiFail(e);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('brands.edit');
    try {
      const body = await req.json();
      const name = String(body.name ?? '').trim();
      if (!name) return NextResponse.json({ error: 'bad_input' }, { status: 400 });
      let slug = String(body.slug ?? '').trim();
      if (!slug) {
        slug =
          name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'brand';
      }
      const exists = await prisma.brand.findUnique({ where: { slug } });
      if (exists) slug = `${slug}-${Date.now().toString(36)}`;
      const brand = await prisma.brand.create({
        data: {
          slug,
          name,
          nameZh: String(body.nameZh ?? '').trim() || null,
          logoUrl: String(body.logoUrl ?? '').trim() || null,
        },
      });
      return NextResponse.json({ ok: true, brand });
    } catch (e) {
      console.error('create brand error', e);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
  } catch (e) {
    return apiFail(e);
  }
}
