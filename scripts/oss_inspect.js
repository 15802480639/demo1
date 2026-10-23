// 检查 bucket 现状：对象数、是否公网可读、访问域名
const OSS = require('ali-oss');

async function getCred() {
  const r = await fetch('http://100.100.100.200/latest/meta-data/ram/security-credentials/JNDOSSImageRole');
  return await r.json();
}

(async () => {
  const cred = await getCred();
  for (const [bucket, region] of [['jd-oss', 'oss-cn-hongkong'], ['jnd-image', 'oss-cn-beijing']]) {
    const client = new OSS({
      region, bucket,
      accessKeyId: cred.AccessKeyId, accessKeySecret: cred.AccessKeySecret, stsToken: cred.SecurityToken,
      secure: true, timeout: '30s',
    });
    console.log(`\n########## ${bucket} (${region}) ##########`);

    // 1) 桶 ACL
    try {
      const acl = await client.getBucketACL();
      console.log('ACL:', acl.acl);
    } catch (e) { console.log('ACL: 读取失败', e.code || e.message); }

    // 2) 对象列表（前 20 个）
    try {
      const list = await client.list({ 'max-keys': 20 });
      console.log(`对象数(本页): ${list.objects.length}, total? ${list.nextMarker ? '有更多' : '已到底'}`);
      list.objects.slice(0, 20).forEach((o) => console.log('  -', o.name, o.size));
    } catch (e) { console.log('列举失败:', e.code || e.message); }

    // 3) 公网可读性（不带凭证直连 URL）
    const url = `https://${bucket}.${region}.aliyuncs.com/`;
    try {
      const r = await fetch(url, { method: 'GET' });
      console.log('公网 GET 桶根:', r.status);
    } catch (e) { console.log('公网 GET 桶根: 网络错误', e.message); }

    // 4) 公网可读性（直读一个具体对象）
    try {
      const list = await client.list({ 'max-keys': 1 });
      if (list.objects.length) {
        const objUrl = `https://${bucket}.${region}.aliyuncs.com/${encodeURIComponent(list.objects[0].name)}`;
        const r = await fetch(objUrl);
        console.log(`公网读对象 "${list.objects[0].name}":`, r.status, r.headers.get('content-type'));
      } else {
        console.log('桶内暂无对象，跳过公网读测试');
      }
    } catch (e) { console.log('公网读对象测试失败:', e.message); }
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
