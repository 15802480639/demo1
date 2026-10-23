// 决定性测试：写入真实文件后，公网直读是否 200
const OSS = require('ali-oss');
const fs = require('fs');

async function getCred() {
  const r = await fetch('http://100.100.100.200/latest/meta-data/ram/security-credentials/JNDOSSImageRole');
  return await r.json();
}

// 造一个 1x1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

(async () => {
  const cred = await getCred();
  for (const [bucket, region] of [['jd-oss', 'oss-cn-hongkong'], ['jnd-image', 'oss-cn-beijing']]) {
    const client = new OSS({
      region, bucket,
      accessKeyId: cred.AccessKeyId, accessKeySecret: cred.AccessKeySecret, stsToken: cred.SecurityToken,
      secure: true, timeout: '30s',
    });
    console.log(`\n########## ${bucket} (${region}) ##########`);
    const key = `uploads/_probe/pub-${Date.now()}.png`;
    try {
      await client.put(key, PNG);
      console.log('写入 OK:', key, PNG.length, 'bytes');
    } catch (e) { console.log('写入失败:', e.code, e.message); continue; }

    // 公网直读
    for (const url of [
      `https://${bucket}.${region}.aliyuncs.com/${key}`,
      `http://${bucket}.${region}.aliyuncs.com/${key}`,
    ]) {
      try {
        const r = await fetch(url);
        console.log(`  公网 GET ${url}\n    -> ${r.status} ${r.headers.get('content-type')} len=${r.headers.get('content-length')}`);
      } catch (e) { console.log(`  公网 GET ${url} -> 网络错误 ${e.message}`); }
    }

    // 带凭证读（后端代理方案）
    try {
      const res = await client.get(key);
      console.log('  带凭证 GET -> OK, size=', res.content.length, 'type=', res.res.headers['content-type']);
    } catch (e) { console.log('  带凭证 GET 失败', e.code); }

    // 尝试设置公共读 ACL
    try {
      await client.putBucketACL('public-read');
      console.log('  ★ setBucketACL(public-read) 成功');
    } catch (e) { console.log('  setBucketACL(public-read) 失败:', e.code, String(e.message).slice(0, 100)); }

    // 清理
    try { await client.delete(key); console.log('  清理 OK'); } catch (e) { console.log('  清理失败', e.code); }
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
