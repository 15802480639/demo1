import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

// standalone 预览/生产 server 启动时扫描一次 public 文件清单，
// 之后新上传到 /uploads 的文件不在清单里会 404。
// next.config.ts 的 rewrites 把静态服务覆盖不到的 /uploads/* 兜底到这里动态读盘
//（老文件仍走原生静态服务，不受影响）。
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await params;
  const rel = parts.join('/');
  if (!rel || rel.includes('..')) {
    return NextResponse.json({ error: 'BAD_PATH' }, { status: 400 });
  }
  const ext = (rel.split('.').pop() || '').toLowerCase();
  const mime = MIME[ext];
  if (!mime) {
    return NextResponse.json({ error: 'BAD_TYPE' }, { status: 400 });
  }

  // 与上传 API 同一套目录探测：standalone cwd = .next/standalone
  const cwd = process.cwd();
  const isStandalone =
    cwd.split(path.sep).slice(-2).join(path.sep) === `.next${path.sep}standalone`;
  const candidates = isStandalone
    ? [
        path.join(cwd, 'public', 'uploads'),
        path.join(cwd, '..', '..', 'public', 'uploads'),
      ]
    : [path.join(cwd, 'public', 'uploads')];

  for (const dir of candidates) {
    try {
      const buf = await fs.readFile(path.join(dir, rel));
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      // 尝试下一个目录
    }
  }
  return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
}
