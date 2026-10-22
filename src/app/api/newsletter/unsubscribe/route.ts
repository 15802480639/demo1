import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyUnsubscribe } from '@/lib/unsubscribe';

/**
 * 一键退订（邮件链接直接打开，返回 HTML 页面）
 * 链接形如：/api/newsletter/unsubscribe?email=xxx&t=<签名>
 * 签名校验通过 → status 置为 unsub（已退订）
 */
export async function GET(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get('email') ?? '').toLowerCase().trim();
  const token = req.nextUrl.searchParams.get('t') ?? '';

  const ok = verifyUnsubscribe(email, token);
  let detail = '';

  if (!ok) {
    detail = '链接无效或已损坏，请回到网站重新操作。';
  } else {
    const sub = await prisma.newsletterSub.findUnique({ where: { email } });
    if (!sub) {
      detail = '该邮箱不在订阅列表中。';
    } else if (sub.status !== 'unsub') {
      await prisma.newsletterSub.update({ where: { email }, data: { status: 'unsub' } });
      detail = '退订成功，你不会再收到我们的邮件。';
    } else {
      detail = '你已经退订过了，无需重复操作。';
    }
  }

  const title = ok && detail.startsWith('退订成功') ? '退订成功' : '退订';
  const color = ok && detail.startsWith('退订成功') ? '#16a34a' : '#b91c1c';

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>${title}</title>
</head>
<body style="margin:0;padding:40px 20px;background:#f6f5f2;font-family:-apple-system,'Segoe UI','Malgun Gothic',sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e2dc;padding:40px 32px;text-align:center;">
    <div style="font-size:22px;font-weight:600;color:${color};margin-bottom:14px;">${title}</div>
    <p style="font-size:14px;line-height:1.8;color:#3f3f3a;margin:0;">${escapeHtml(detail)}</p>
    ${email ? `<p style="font-size:12px;color:#8a8780;margin-top:18px;word-break:break-all;">${escapeHtml(email)}</p>` : ''}
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}