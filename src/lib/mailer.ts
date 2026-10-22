// 轻量邮件发送模块（零运行时依赖）。
// 若设置了 SMTP_*/RESEND_API_KEY 则真实发送，否则仅打印日志、不报错。
// 这样在演示/原型环境无需凭据也能正常运行。

export type MailProvider = 'resend' | 'dryrun';

/** 当前是否真实发信（有 provider 且有 key）。false = 只写日志，可上线前验证全流程。 */
export function isLiveMail(): boolean {
  const resendKey = process.env.RESEND_API_KEY;
  return !!(process.env.SMTP_HOST || resendKey);
}

type MailInput = { to: string; subject: string; html: string; text?: string };

export async function sendEmail({ to, subject, html, text }: MailInput): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const resendKey = process.env.RESEND_API_KEY;

  if (!smtpHost && !resendKey) {
    console.log('[mail] DRYRUN (未配置 RESEND_API_KEY / SMTP_HOST):', to, '|', subject);
    return;
  }

  try {
    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.MAIL_FROM || 'shop@webshopp.kr',
          to,
          subject,
          html,
          ...(text ? { text } : {}),
        }),
        // 群发时单封挂死不能拖垮整批
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        console.error('[mail] resend failed', res.status, await res.text().catch(() => ''));
      }
      return;
    }

    // SMTP via nodemailer（动态 import：'as string' 让 TS 不解析模块，
    // 未安装时 catch 到 null 安全跳过；装了则直接使用）
    const nodemailer = await import('nodemailer' as string).catch(() => null) as any;
    if (!nodemailer) {
      console.log('[mail] nodemailer not installed; skipped:', to, subject);
      return;
    }
    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER || smtpHost,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });
  } catch (e) {
    console.error('[mail] send error', e);
  }
}

/**
 * 群发单封的返回值包装 —— **永远不抛异常**，
 * 单封失败不能中断整批（否则第 3 封挂了后面全发不出去）。
 */
export async function sendMailSafe(
  input: MailInput
): Promise<{ ok: boolean; error?: string }> {
  try {
    await sendEmail(input);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 串行群发 + 限速。
 * 串行是刻意的：并发打满会触发服务商风控，本机内存也扛不住。
 */
export async function sendBatch(
  items: MailInput[],
  opts?: { gapMs?: number }
): Promise<{ total: number; ok: number; failed: number; errors: string[] }> {
  const gap = opts?.gapMs ?? 300;
  let ok = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const item of items) {
    const r = await sendMailSafe(item);
    if (r.ok) ok++;
    else {
      failed++;
      if (errors.length < 10) errors.push(`${item.to}: ${r.error}`);
    }
    if (gap > 0) await new Promise((r) => setTimeout(r, gap));
  }
  return { total: items.length, ok, failed, errors };
}

export function orderConfirmationHtml(opts: {
  orderNo: string;
  total: number;
  items: { name: string; quantity: number; price: number }[];
  locale: string;
}): string {
  const cur = (n: number) => `₩${n.toLocaleString('ko-KR')}`;
  const rows = opts.items
    .map(
      (i) =>
        `<tr><td>${i.name}</td><td align="right">${i.quantity}</td><td align="right">${cur(i.price * i.quantity)}</td></tr>`,
    )
    .join('');
  const title = opts.locale === 'ko' ? '주문이 접수되었습니다' : 'Order Confirmation';
  return `<div style="font-family:sans-serif;max-width:520px;margin:auto">
    <h2>${title}</h2>
    <p>${opts.orderNo}</p>
    <table width="100%" cellpadding="6" style="border-collapse:collapse">
      ${rows}
      <tr><td colspan="2"></td><td align="right"><b>${cur(opts.total)}</b></td></tr>
    </table>
  </div>`;
}

export function shippedHtml(opts: {
  orderNo: string;
  carrier: string;
  trackingNo: string;
  locale: string;
}): string {
  const title = opts.locale === 'ko' ? '배송이 시작되었습니다' : 'Your order has shipped';
  return `<div style="font-family:sans-serif;max-width:520px;margin:auto">
    <h2>${title}</h2>
    <p>${opts.orderNo}</p>
    <p>${opts.carrier} · ${opts.trackingNo}</p>
  </div>`;
}
