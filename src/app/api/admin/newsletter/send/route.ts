import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, HttpError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isLiveMail, sendBatch } from '@/lib/mailer';
import { renderNewsletterHtml, renderNewsletterText, type MailLocale } from '@/lib/mail-template';
import { unsubscribeUrl } from '@/lib/unsubscribe';
import { siteConfig } from '@/lib/site';

/** 上限保护：一次最多发 1000 封，防止误操作把库刷爆 */
const MAX_RECIPIENTS = 1000;

function siteBase(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env && !env.includes('localhost') && !env.includes('127.0.0.1')) return env.replace(/\/$/, '');
  // 本地预览时 NEXT_PUBLIC_SITE_URL 指向生产域名，回落用请求头
  return siteConfig.url.replace(/\/$/, '');
}

function normalizeLocale(s: string): MailLocale {
  return s === 'zh' || s === 'en' ? s : 'ko';
}

/** 后台：群发电子报 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'UNKNOWN' },
      { status }
    );
  }

  const body = await req.json().catch(() => ({}));
  const subject = String(body.subject ?? '').trim();
  const text = String(body.body ?? '').trim();
  const locale = normalizeLocale(String(body.locale ?? 'ko'));
  // testTo 非空 = 只发给这一个测试邮箱（不进正式记录统计口径）
  const testTo = String(body.testTo ?? '').trim().toLowerCase();

  if (!subject) return NextResponse.json({ ok: false, error: 'NO_SUBJECT' }, { status: 400 });
  if (!text) return NextResponse.json({ ok: false, error: 'NO_BODY' }, { status: 400 });
  if (testTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo)) {
    return NextResponse.json({ ok: false, error: 'INVALID_TEST_EMAIL' }, { status: 400 });
  }

  const base = siteBase();

  // ---- 测试发送：只发一封，不碰正式群发 ----
  if (testTo) {
    const unsub = unsubscribeUrl(base, testTo);
    const html = renderNewsletterHtml({
      locale, subject, body: text,
      unsubscribeUrl: unsub, siteUrl: base,
      logoUrl: `${base}/brand/jnd-logo.png`,
    });
    const plain = renderNewsletterText({ locale, subject, body: text, unsubscribeUrl: unsub, siteUrl: base });
    const r = await sendBatch([{ to: testTo, subject, html, text: plain }], { gapMs: 0 });

    await prisma.newsletterCampaign.create({
      data: {
        subject, body: text, locale, kind: 'test',
        recipients: 1, sent: r.ok, failed: r.failed,
        dryRun: !isLiveMail(),
        errorLog: r.errors.join('\n'),
      },
    });

    return NextResponse.json({
      ok: true, dryRun: !isLiveMail(),
      sent: r.ok, failed: r.failed, errors: r.errors,
    });
  }

  // ---- 正式群发：只发 status=active 的 ----
  const subs = await prisma.newsletterSub.findMany({
    where: { status: 'active' },
    orderBy: { createdAt: 'asc' },
    take: MAX_RECIPIENTS,
    select: { email: true, locale: true },
  });

  if (subs.length === 0) {
    return NextResponse.json({ ok: false, error: 'NO_ACTIVE_SUBS' }, { status: 400 });
  }

  // 按订阅者自己的语种渲染（locale 空串当 ko）
  const items = subs.map((s) => {
    const loc = normalizeLocale(s.locale);
    const unsub = unsubscribeUrl(base, s.email);
    return {
      to: s.email,
      subject,
      html: renderNewsletterHtml({
        locale: loc, subject, body: text,
        unsubscribeUrl: unsub, siteUrl: base,
        logoUrl: `${base}/brand/jnd-logo.png`,
      }),
      text: renderNewsletterText({
        locale: loc, subject, body: text, unsubscribeUrl: unsub, siteUrl: base,
      }),
    };
  });

  const r = await sendBatch(items);

  await prisma.newsletterCampaign.create({
    data: {
      subject, body: text, locale,
      kind: 'broadcast',
      recipients: subs.length,
      sent: r.ok, failed: r.failed,
      dryRun: !isLiveMail(),
      errorLog: r.errors.join('\n'),
    },
  });

  return NextResponse.json({
    ok: true, dryRun: !isLiveMail(),
    recipients: r.total, sent: r.ok, failed: r.failed, errors: r.errors,
  });
}