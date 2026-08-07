import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  await requireAdmin();
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'NO_FILE' }, { status: 400 });
  }
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
    return NextResponse.json({ error: 'BAD_TYPE' }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const name = `${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buf);
  return NextResponse.json({ url: `/uploads/${name}` });
}
