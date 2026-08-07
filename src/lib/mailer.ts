// 轻量邮件发送模块（零运行时依赖）。
// 若设置了 SMTP_*/RESEND_API_KEY 则真实发送，否则仅打印日志、不报错。
// 这样在演示/原型环境无需凭据也能正常运行。

type MailInput = { to: string; subject: string; html: string };

export async function sendEmail({ to, subject, html }: MailInput): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const resendKey = process.env.RESEND_API_KEY;

  if (!smtpHost && !resendKey) {
    console.log('[mail] skipped (no SMTP/RESEND config):', to, subject);
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
        }),
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
    });
  } catch (e) {
    console.error('[mail] send error', e);
  }
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
