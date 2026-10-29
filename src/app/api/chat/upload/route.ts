import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOssConfig, uploadToOss } from '@/lib/oss';
import { prisma } from '@/lib/prisma';
import { resolveStaff } from '@/lib/chat-staff';
import { judgeVisitorAccess } from '@/lib/chat-visitor';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const ALLOWED = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

// 解析 public/uploads/chat 目录（项目根与 standalone cwd 双写，保证两种运行态都能访问）
async function resolveChatDirs() {
  const cwd = process.cwd();
  const isStandalone = cwd.split(path.sep).slice(-2).join(path.sep) === `.next${path.sep}standalone`;
  const projectRoot = isStandalone ? path.resolve(cwd, '..', '..') : cwd;
  const projectDir = path.join(projectRoot, 'public', 'uploads', 'chat');
  const dirs = [projectDir];
  const standaloneDir = path.join(cwd, 'public', 'uploads', 'chat');
  if (standaloneDir !== projectDir) {
    try {
      await fs.mkdir(standaloneDir, { recursive: true });
      dirs.push(standaloneDir);
    } catch {
      /* noop */
    }
  }
  await fs.mkdir(dirs[0], { recursive: true });
  return dirs;
}

// POST /api/chat/upload —— 客服图片（admin 或 H5 客服 agent）或访客图片
// 访客侧：必须已登录且是该会话的归属用户（历史游客会话回落 guestToken）
// 走 OSS 优先，失败回落本地 /uploads/chat。返回可访问 URL。
export async function POST(req: NextRequest) {
  const session = await getSession();
  const isAdmin = session?.role === 'admin';
  // H5 客服也可上传图片
  const staff = isAdmin ? null : await resolveStaff();
  const guest = req.nextUrl.searchParams.get('guest');

  if (!isAdmin && !staff) {
    if (!guest) return NextResponse.json({ error: 'NO_GUEST' }, { status: 401 });
    const conv = await prisma.chatConversation.findFirst({
      where: { guestToken: guest },
      select: { id: true, userId: true, guestToken: true },
    });
    if (!conv) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    const access = judgeVisitorAccess({
      convUserId: conv.userId,
      storedGuest: conv.guestToken,
      guestToken: guest,
      session,
    });
    if (!access.ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const form = await req.formData();
  const files = [...(form.getAll('file') as File[]), ...(form.getAll('files') as File[])].filter(
    (f) => f instanceof File && f.size > 0
  );
  if (files.length === 0) return NextResponse.json({ error: 'NO_FILE' }, { status: 400 });

  const oss = getOssConfig();
  const urls: string[] = [];
  let dirs: string[] = [];
  if (!oss.enabled) dirs = await resolveChatDirs();

  for (const file of files) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    if (!ALLOWED.includes(ext)) return NextResponse.json({ error: 'BAD_TYPE' }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'TOO_LARGE' }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());

    if (oss.enabled) {
      try {
        urls.push(await uploadToOss(buf, file.name, 'uploads/chat'));
        continue;
      } catch {
        if (urls.length === 0) dirs = await resolveChatDirs();
      }
    }
    const name = `${crypto.randomBytes(10).toString('hex')}.${ext}`;
    for (const dir of dirs) {
      await fs.writeFile(path.join(/*turbopackIgnore: true*/ dir, name), buf);
    }
    urls.push(`/uploads/chat/${name}`);
  }

  return NextResponse.json({ url: urls[0], urls, storage: oss.enabled ? 'oss' : 'local' });
}
