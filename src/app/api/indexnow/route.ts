import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { pushAllSiteUrls, pushPaths, getIndexNowKey } from '@/lib/indexnow';

/**
 * IndexNow API
 *   GET  → 自检：是否配置了密钥、密钥文件放哪
 *   POST → 批量推送。body: { paths?: string[], all?: true, key?: string }
 */

export async function GET() {
  await requireAdmin();
  const key = await getIndexNowKey();
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  return NextResponse.json({
    configured: Boolean(key),
    siteUrl: base,
    keyMasked: key ? `${key.slice(0, 4)}…${key.slice(-4)}` : '',
    keyFile: key ? `${base}/${key}.txt` : '',
    hint: key
      ? '确认密钥文件可公网 200 访问后即可推送'
      : '未配置：在后台「SEO 设置」填 IndexNow key（8~128 位字母数字或连字符）',
  });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const key = typeof body.key === 'string' && body.key.trim() ? body.key.trim() : undefined;

  if (body.all === true) {
    const res = await pushAllSiteUrls(key);
    return NextResponse.json(res);
  }

  const paths: string[] = Array.isArray(body.paths) ? body.paths.slice(0, 500) : [];
  if (paths.length === 0) {
    return NextResponse.json(
      { error: '提供 paths 数组，或 all: true 推送全站' },
      { status: 400 }
    );
  }
  const res = await pushPaths(paths, key);
  return NextResponse.json(res);
}