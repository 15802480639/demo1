import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  await requireAdmin();
  const banners = await prisma.heroBanner.findMany({ orderBy: { order: 'asc' } });
  return NextResponse.json(banners);
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();
  if (!body.image) {
    return NextResponse.json({ error: 'IMAGE_REQUIRED' }, { status: 400 });
  }
  const banner = await prisma.heroBanner.create({
    data: {
      image: body.image,
      title: body.title || null,
      titleZh: body.titleZh || null,
      subtitle: body.subtitle || null,
      subtitleZh: body.subtitleZh || null,
      cta: body.cta || null,
      ctaZh: body.ctaZh || null,
      href: body.href || null,
      order: Number(body.order) || 0,
      status: body.status || 'published',
    },
  });
  return NextResponse.json(banner);
}
