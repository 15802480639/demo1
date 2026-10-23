import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { uploadToOss, getOssConfig } from '@/lib/oss';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const ALLOWED = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];

/** 解析项目根目录（standalone 下 cwd 会被 chdir） */
async function resolveDirs() {
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
  return dirs;
}

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

  const oss = getOssConfig();
  const urls: string[] = [];
  let ossUsed = 0;
  let ossError = '';

  // OSS 开启时优先走 OSS；失败则回落到本地磁盘（不阻断运营）
  let dirs: string[] = [];
  if (!oss.enabled) {
    dirs = await resolveDirs();
    await fs.mkdir(dirs[0], { recursive: true });
  }

  for (const file of files) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    if (!ALLOWED.includes(ext)) {
      return NextResponse.json({ error: 'BAD_TYPE', file: file.name }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'TOO_LARGE', file: file.name }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());

    if (oss.enabled) {
      try {
        const url = await uploadToOss(buf, file.name, 'uploads');
        urls.push(url);
        ossUsed++;
        continue;
      } catch (e) {
        ossError = String((e as Error)?.message || e).slice(0, 200);
        // 第一个文件就失败 → 整体回落本地；否则保留已成功的 OSS 链接
        if (urls.length === 0) {
          const fallback = await resolveDirs();
          await fs.mkdir(fallback[0], { recursive: true });
          const localName = `${crypto.randomBytes(8).toString('hex')}.${ext}`;
          for (const dir of fallback) {
            // ⚠️ turbopackIgnore：上传目录是运行时动态路径。
            // 若参与静态分析，Next 16 会把整个项目（含 public 全部源文件）纳入 tracing，
            // 构建内存与产物体积暴涨 —— 1.7G 内存的生产机直接构建失败。
            await fs.writeFile(path.join(/*turbopackIgnore: true*/ dir, localName), buf);
          }
          urls.push(`/uploads/${localName}`);
          continue;
        }
      }
    }

    const name = `${crypto.randomBytes(8).toString('hex')}.${ext}`;
    for (const dir of dirs) {
      // ⚠️ turbopackIgnore：上传目录是运行时动态路径。
      // 若参与静态分析，Next 16 会把整个项目（含 public 全部源文件）纳入 tracing，
      // 构建内存与产物体积暴涨 —— 1.7G 内存的生产机直接构建失败。
      await fs.writeFile(path.join(/*turbopackIgnore: true*/ dir, name), buf);
    }
    urls.push(`/uploads/${name}`);
  }

  return NextResponse.json({
    url: urls[0],
    urls,
    storage: ossUsed > 0 ? 'oss' : 'local',
    ...(ossError ? { ossError } : {}),
  });
}
