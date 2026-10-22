import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  await requireAdmin();
  const faqs = await prisma.faqItem.findMany({
    orderBy: [{ scope: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({ faqs });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const b = await req.json();
  const question = String(b.question ?? '').trim();
  const answer = String(b.answer ?? '').trim();
  if (!question || !answer) {
    return NextResponse.json({ error: 'INVALID' }, { status: 400 });
  }
  const faq = await prisma.faqItem.create({
    data: {
      question,
      answer,
      locale: String(b.locale ?? ''),
      scope: b.scope === 'product' ? 'product' : 'global',
      target: b.scope === 'product' ? String(b.target ?? '').trim() : '',
      order: Number(b.order) || 0,
      status: b.status === 'draft' ? 'draft' : 'published',
    },
  });
  return NextResponse.json({ faq });
}

export async function PUT(req: NextRequest) {
  await requireAdmin();
  const b = await req.json();
  const id = String(b.id ?? '');
  if (!id) return NextResponse.json({ error: 'NO_ID' }, { status: 400 });
  const faq = await prisma.faqItem.update({
    where: { id },
    data: {
      question: String(b.question ?? '').trim(),
      answer: String(b.answer ?? '').trim(),
      locale: String(b.locale ?? ''),
      scope: b.scope === 'product' ? 'product' : 'global',
      target: b.scope === 'product' ? String(b.target ?? '').trim() : '',
      order: Number(b.order) || 0,
      status: b.status === 'draft' ? 'draft' : 'published',
    },
  });
  return NextResponse.json({ faq });
}

export async function DELETE(req: NextRequest) {
  await requireAdmin();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'NO_ID' }, { status: 400 });
  await prisma.faqItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}