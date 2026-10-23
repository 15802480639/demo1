/**
 * 阿里云 OSS 存储（ECS RAM Role 方式）
 *
 * 凭证来源：ECS 实例元数据服务上的 RAM 角色临时凭证（STS）
 *   http://100.100.100.200/latest/meta-data/ram/security-credentials/<RoleName>
 * 好处：服务器上不保存任何长期 AccessKey，凭证自动轮换（默认 6 小时）。
 *
 * 优先读取环境变量（可用则用），否则回落到 ECS RAM Role：
 *   OSS_BUCKET / OSS_REGION / OSS_ROLE_NAME
 *   OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_STS_TOKEN（可选，留空即走 RAM Role）
 */

import OSS from 'ali-oss';
import crypto from 'crypto';

const META_BASE = 'http://100.100.100.200/latest/meta-data/ram/security-credentials';

export type OssConfig = {
  bucket: string;
  region: string;
  /** 公网访问域名（图片直接放前台用） */
  publicUrl: string;
  enabled: boolean;
};

type StsCred = {
  AccessKeyId: string;
  AccessKeySecret: string;
  SecurityToken: string;
  Expiration: string;
};

let cachedCred: StsCred | null = null;
let cachedAt = 0;
let cachedClient: OSS | null = null;
let cachedClientKey = '';

/** 提前 5 分钟刷新，避免凭证在请求途中过期 */
const REFRESH_GAP_MS = 5 * 60 * 1000;

export function getOssConfig(): OssConfig {
  const bucket = (process.env.OSS_BUCKET || '').trim();
  const region = (process.env.OSS_REGION || 'oss-cn-hongkong').trim();
  const explicitUrl = (process.env.OSS_PUBLIC_URL || '').trim();
  const publicUrl =
    explicitUrl ||
    (bucket ? `https://${bucket}.${region}.aliyuncs.com` : '');
  return {
    bucket,
    region,
    publicUrl,
    enabled: Boolean(bucket),
  };
}

/** 从 ECS 元数据服务取 RAM Role 临时凭证（带缓存） */
async function fetchStsCredential(roleName: string): Promise<StsCred> {
  const now = Date.now();
  if (cachedCred && now - cachedAt < REFRESH_GAP_MS) {
    return cachedCred;
  }
  const res = await fetch(`${META_BASE}/${encodeURIComponent(roleName)}`, {
    // 凭证获取不需要缓存
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`OSS_STS_FETCH_FAILED:${res.status}`);
  }
  const data = (await res.json()) as StsCred;
  if (!data.AccessKeyId || !data.AccessKeySecret) {
    throw new Error('OSS_STS_INVALID');
  }
  cachedCred = data;
  cachedAt = now;
  return data;
}

type CredentialInput = {
  accessKeyId: string;
  accessKeySecret: string;
  stsToken?: string;
  refreshSTSToken?: () => Promise<{ accessKeyId: string; accessKeySecret: string; stsToken: string }>;
};

/** 构造凭证提供器：有静态 AK 用静态，没有就走 ECS RAM Role 并自动续期 */
async function buildCredential(cfg: OssConfig): Promise<CredentialInput> {
  const ak = (process.env.OSS_ACCESS_KEY_ID || '').trim();
  const sk = (process.env.OSS_ACCESS_KEY_SECRET || '').trim();
  const token = (process.env.OSS_STS_TOKEN || '').trim();

  if (ak && sk) {
    return {
      accessKeyId: ak,
      accessKeySecret: sk,
      ...(token ? { stsToken: token } : {}),
    };
  }

  const roleName = (process.env.OSS_ROLE_NAME || 'JNDOSSImageRole').trim();
  const cred = await fetchStsCredential(roleName);
  return {
    accessKeyId: cred.AccessKeyId,
    accessKeySecret: cred.AccessKeySecret,
    stsToken: cred.SecurityToken,
    // 官方 SDK 要求的续期回调：凭证过期前自动换新，无需重启
    refreshSTSToken: async () => {
      cachedCred = null;
      const next = await fetchStsCredential(roleName);
      return {
        accessKeyId: next.AccessKeyId,
        accessKeySecret: next.AccessKeySecret,
        stsToken: next.SecurityToken,
      };
    },
  };
}

/** 取得 OSS 客户端（单例） */
export async function getOssClient(): Promise<OSS | null> {
  const cfg = getOssConfig();
  if (!cfg.enabled) return null;

  const clientKey = `${cfg.bucket}@${cfg.region}`;
  if (cachedClient && cachedClientKey === clientKey) {
    return cachedClient;
  }

  const credential = await buildCredential(cfg);
  cachedClient = new OSS({
    region: cfg.region,
    bucket: cfg.bucket,
    ...credential,
    secure: true,
    timeout: '60s',
  } as ConstructorParameters<typeof OSS>[0]);
  cachedClientKey = clientKey;
  return cachedClient;
}

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

/**
 * 上传文件到 OSS
 * @returns 公网可访问的完整 URL
 */
export async function uploadToOss(
  buffer: Buffer,
  originalName: string,
  folder = 'uploads'
): Promise<string> {
  const cfg = getOssConfig();
  const client = await getOssClient();
  if (!client) throw new Error('OSS_NOT_CONFIGURED');

  const ext = (originalName.split('.').pop() || 'bin').toLowerCase();
  const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const key = `${folder.replace(/^\/+|\/+$/g, '')}/${name}`;

  await client.put(key, buffer, {
    mime: EXT_MIME[ext] || 'application/octet-stream',
    headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
  });

  return `${cfg.publicUrl}/${key}`;
}

/** 删除 OSS 对象（失败不抛，调用方自行决定是否要紧） */
export async function deleteFromOss(url: string): Promise<boolean> {
  try {
    const cfg = getOssConfig();
    if (!cfg.enabled) return false;
    const prefix = `${cfg.publicUrl}/`;
    if (!url.startsWith(prefix)) return false;
    const key = decodeURIComponent(url.slice(prefix.length));
    const client = await getOssClient();
    if (!client) return false;
    await client.delete(key);
    return true;
  } catch {
    return false;
  }
}
