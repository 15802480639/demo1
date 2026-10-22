import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const ALLOWED = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];

export async function POST(req: NextRequest) {
  await requireAdmin();
  const form = await req.formData();
  // 支持多文件：file / files 字段均可，一次上传多张商品图
  const files = [
    ...(form.getAll('file') as File[]),
    ...(form.getAll('files') as File[]),
  ].filter((f) => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return NextResponse.json({ error: 'NO_FILE' }, { status: 400 });
  }

  // ⚠️ standalone server.js 会 process.chdir(__dirname)，cwd 是 .next/standalone 不是项目根
  const cwd = process.cwd();
  const isStandalone = cwd.split(path.sep).slice(-2).join(path.sep) === `.next${path.sep}standalone`;
  const projectRoot = isStandalone ? path.resolve(cwd, '..', '..') : cwd;
  const projectDir = path.join(projectRoot, 'public', 'uploads');
  const dirs = [projectDir];
  const standaloneDir = path.join(cwd, 'public', 'uploads'); // standalone cwd 下即 .next/standalone/public/uploads
  if (standaloneDir !== projectDir) {
    try {
      await fs.mkdir(standaloneDir, { recursive: true });
      dirs.push(standaloneDir);
    } catch {
      // 写不了就只写项目目录
    }
  }

  const urls: string[] = [];
  for (const file of files) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    if (!ALLOWED.includes(ext)) {
      return NextResponse.json({ error: 'BAD_TYPE', file: file.name }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'TOO_LARGE', file: file.name }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const name = `${crypto.randomBytes(8).toString('hex')}.${ext}`;
    await fs.mkdir(projectDir, { recursive: true });
    for (const dir of dirs) {
      // ⚠️ turbopackIgnore：上传目录是运行时动态路径。
      // 若参与静态分析，Next 16 会把整个项目（含 public 全部源文件）纳入 tracing，
      // 构建内存与产物体积暴涨 —— 1.7G 内存的生产机直接构建失败。
      await fs.writeFile(path.join(/*turbopackIgnore: true*/ dir, name), buf);
    }
    urls.push(`/uploads/${name}`);
  }

  return NextResponse.json({ url: urls[0], urls });
}
