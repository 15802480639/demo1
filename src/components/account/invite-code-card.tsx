'use client';

import { useState } from 'react';

export function InviteCodeCard({
  code,
  labels,
}: {
  code: string;
  labels: {
    title: string;
    desc: string;
    codeLabel: string;
    copy: string;
    copied: string;
    hint: string;
    uplineLabel: string;
    uplineName: string | null;
  };
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪贴板不可用（非 https / 旧浏览器）时退回手动选择
      const el = document.createElement('textarea');
      el.value = code;
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* ignore */
      }
      document.body.removeChild(el);
    }
  }

  return (
    <div className="border border-line bg-surface px-5 py-5">
      <p className="font-display text-lg text-ink mb-1">{labels.title}</p>
      <p className="text-sm text-muted mb-4">{labels.desc}</p>

      {labels.uplineName && (
        <p className="text-xs text-muted mb-3">
          {labels.uplineLabel}
          <span className="text-ink font-medium ml-1">{labels.uplineName}</span>
        </p>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs tracking-widest text-muted mb-1">{labels.codeLabel}</p>
          <p className="font-mono text-xl tracking-widest text-ink select-all break-all">
            {code}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="btn-gold shrink-0 self-end"
        >
          {copied ? labels.copied : labels.copy}
        </button>
      </div>

      <p className="text-xs text-muted mt-3">{labels.hint}</p>
    </div>
  );
}
