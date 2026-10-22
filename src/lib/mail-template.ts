/**
 * 电子报邮件模板 —— 三语（ko / zh / en）
 * 设计要点：
 *  1. table 布局（邮件客户端对 flex/grid 支持差）
 *  2. 全部用户输入做 HTML 转义，防止邮件里被注入恶意标签
 *  3. 必须含一键退订链接（合规硬要求：CAN-SPAM / 韩国정보통신망법）
 */

export type MailLocale = 'ko' | 'zh' | 'en';

/** HTML 转义 —— 任何拼进邮件的用户内容都要过这里 */
export function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const UI: Record<MailLocale, { unsub: string; viewSite: string; footer: string; preheader: string }> = {
  ko: {
    unsub: '구독 해제',
    viewSite: '웹사이트에서 보기',
    footer: '본 이메일은 J&D 구독 newsletter를 신청하신 분에게만 발송됩니다.',
    preheader: 'J&D 새로운 소식',
  },
  zh: {
    unsub: '退订',
    viewSite: '在网站查看',
    footer: '本邮件仅发送给订阅 J&D 电子报的用户。',
    preheader: 'J&D 最新消息',
  },
  en: {
    unsub: 'Unsubscribe',
    viewSite: 'View on website',
    footer: 'You are receiving this email because you subscribed to the J&D newsletter.',
    preheader: 'Latest from J&D',
  },
};

export interface MailInput {
  locale: MailLocale;
  subject: string;
  /** 正文：纯文本，段落用空行分隔 */
  body: string;
  unsubscribeUrl: string;
  siteUrl: string;
  logoUrl?: string;
}

/** 纯文本转 HTML 段落 */
function bodyToHtml(body: string): string {
  const paras = String(body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paras.length) return '';
  return paras
    .map((p) => {
      const safe = escapeHtml(p).replace(/\n/g, '<br />');
      return `<p style="margin:0 0 18px;font-size:15px;line-height:1.9;color:#33322e;">${safe}</p>`;
    })
    .join('');
}

/** 生成完整 HTML 邮件 */
export function renderNewsletterHtml(input: MailInput): string {
  const ui = UI[input.locale] ?? UI.en;
  const logo = input.logoUrl
    ? `<img src="${escapeHtml(input.logoUrl)}" alt="J&D" width="120" style="display:block;height:auto;border:0;" />`
    : `<div style="font-size:24px;font-weight:700;letter-spacing:2px;color:#111;">J&amp;D</div>`;

  return `<!DOCTYPE html>
<html lang="${input.locale}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f3ef;">
<div style="display:none;font-size:1px;color:#f4f3ef;">${escapeHtml(ui.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ef;padding:28px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid #e6e3dc;">
        <tr>
          <td style="padding:28px 32px 18px;border-bottom:1px solid #eeebe4;">
            ${logo}
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 8px;">
            <h1 style="margin:0 0 20px;font-size:22px;line-height:1.5;color:#111110;">${escapeHtml(input.subject)}</h1>
            ${bodyToHtml(input.body)}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:12px 32px 28px;">
            <a href="${escapeHtml(input.siteUrl)}"
               style="display:inline-block;padding:13px 30px;background:#111110;color:#ffffff;font-size:14px;letter-spacing:1px;text-decoration:none;">
              ${escapeHtml(ui.viewSite)}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid #eeebe4;">
            <p style="margin:0 0 10px;font-size:12px;line-height:1.8;color:#8a8780;">${escapeHtml(ui.footer)}</p>
            <p style="margin:0;font-size:12px;line-height:1.8;">
              <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#8a8780;text-decoration:underline;">
                ${escapeHtml(ui.unsub)}
              </a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** 纯文本备用版（部分服务商会同时生成 text/plain，提升送达率） */
export function renderNewsletterText(input: MailInput): string {
  const ui = UI[input.locale] ?? UI.en;
  return [
    input.subject,
    '',
    input.body,
    '',
    `${ui.viewSite}: ${input.siteUrl}`,
    '',
    ui.footer,
    `${ui.unsub}: ${input.unsubscribeUrl}`,
  ].join('\n');
}