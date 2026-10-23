// 用官方 SDK + ECS RAM Role 实测 OSS 读写
const OSS = require('ali-oss');
const Credential = require('@alicloud/credentials');

const ROLE = 'JNDOSSImageRole';
const META = `http://100.100.100.200/latest/meta-data/ram/security-credentials/${ROLE}`;

async function getCred() {
  const r = await fetch(META);
  if (!r.ok) throw new Error('meta ' + r.status);
  return await r.json();
}

async function tryBucket(bucket, region) {
  const cred = await getCred();
  const client = new OSS({
    region,
    bucket,
    accessKeyId: cred.AccessKeyId,
    accessKeySecret: cred.AccessKeySecret,
    stsToken: cred.SecurityToken,
    secure: true,
    timeout: '30s',
  });
  const key = `uploads/_probe/luoshen-ram-role-test-${Date.now()}.txt`;
  const body = 'luoshen-oss-ram-role-ok';
  const out = { bucket, region };

  try {
    await client.put(key, Buffer.from(body));
    out.put = 'OK';
  } catch (e) {
    out.put = `${e.code || e.name}: ${String(e.message).slice(0, 120)}`;
    return out;
  }
  try {
    const res = await client.get(key);
    const txt = res.content.toString();
    out.get = txt === body ? 'OK (内容一致)' : `MISMATCH: ${txt.slice(0, 60)}`;
  } catch (e) {
    out.get = `${e.code || e.name}: ${String(e.message).slice(0, 120)}`;
  }
  try {
    const head = await client.head(key);
    out.head = `OK size=${head.res.headers['content-length']}`;
  } catch (e) {
    out.head = `${e.code || e.name}`;
  }
  try {
    await client.delete(key);
    out.del = 'OK (已清理)';
  } catch (e) {
    out.del = `${e.code || e.name}`;
  }
  return out;
}

(async () => {
  const cred = await getCred();
  console.log('=== RAM Role 临时凭证 ===');
  console.log('AccessKeyId:', cred.AccessKeyId);
  console.log('Expiration :', cred.Expiration);
  console.log('有 SecurityToken:', !!cred.SecurityToken);
  console.log();

  const targets = [];
  // 已知 region 的组合
  const known = [
    ['jd-oss', 'oss-cn-hongkong'],
    ['jnd-image', 'oss-cn-beijing'],
    ['jnd', 'oss-cn-beijing'],
  ];
  for (const [b, r] of known) targets.push([b, r]);
  // 广撒网：常见名字 × 常见 region
  const names = ['jd-oss', 'jnd-oss', 'jndoss', 'jnd-image', 'jnd-images', 'jndimg',
                 'jnd-static', 'jnd-web', 'jnd-media', 'jnd-upload', 'jnd-uploads',
                 'jnd-oss-image', 'jndossimage', 'jnd-golf', 'jnd-shop', 'jnd-store',
                 'jnd-product', 'jnd-products', 'jnd-ecommerce', 'jnd-assets', 'jnd-static-files'];
  const regions = ['oss-cn-hongkong', 'oss-cn-beijing', 'oss-cn-shanghai', 'oss-cn-singapore'];
  for (const n of names) for (const r of regions) targets.push([n, r]);

  const hits = [];
  let i = 0;
  for (const [b, r] of targets) {
    i++;
    if (i % 25 === 0) console.log(`  ...已测 ${i}/${targets.length}`);
    const res = await tryBucket(b, r);
    if (res.put === 'OK') {
      hits.push(res);
      console.log('\n★★★ 写入成功:', JSON.stringify(res));
    }
  }
  console.log('\n\n================ 成功列表 ================');
  console.log(JSON.stringify(hits, null, 2));
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
