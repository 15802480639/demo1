import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  const body = await req.json();
  const banner = await prisma.heroBanner.update({
    where: { id },
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  await prisma.heroBanner.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
