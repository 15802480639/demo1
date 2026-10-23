"""本轮 5 项修复的可视化截图。

输出：_review-shots/fix-*.png
"""
import os
import json
import http.cookiejar
import urllib.request

BASE = "http://127.0.0.1:3000"
OUT = "_review-shots"
CHROME = r"C:\Users\Administrator\AppData\Local\ms-playwright\chromium-1248\chrome-win64\chrome.exe"

os.makedirs(OUT, exist_ok=True)

from playwright.sync_api import sync_playwright

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def api(path, data=None, method=None):
    url = BASE + path
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method=method or ("POST" if body else "GET"))
    if body:
        req.add_header("Content-Type", "application/json")
    try:
        with opener.open(req, timeout=20) as r:
            raw = r.read().decode("utf-8", "replace")
            return json.loads(raw) if raw.strip().startswith(("{", "[")) else {}
    except Exception as e:
        print(f"  ! API {path} 失败: {e}")
        return {}


def clear_jar():
    jar.clear()


# 1. 管理员登录
api("/api/auth/login", {"email": "admin@shop.com", "password": "admin1234"})
print("管理员已登录")

# 2. 给 admin 自己发点积分（截图有内容看），并确保有一张券可发
cs = api("/api/admin/customers")
me_admin = next((c for c in cs.get("customers", []) if c.get("email") == "admin@shop.com"), None)
if me_admin:
    api(f"/api/admin/customers/{me_admin['id']}/points", {"amount": 52000, "remark": "活动赠送"})
    print("已给 admin 发 52000 积分（截图用）")

# 3. 用 admin 身份发一张自己的券（「我的优惠券」页有内容）
if me_admin:
    coupons = api("/api/admin/coupons").get("coupons", [])
    if coupons:
        api(f"/api/admin/customers/{me_admin['id']}/coupons", {"couponId": coupons[0]["id"]})
        print("已给 admin 发券", coupons[0].get("code"))

# cookie 注入 playwright
cookies = []
for c in jar:
    cookies.append({"name": c.name, "value": c.value, "domain": "127.0.0.1", "path": "/"})

pages = [
    ("fix-01-points", "/zh/account/points", True),
    ("fix-02-coupons", "/zh/account/coupons", True),
    ("fix-03-customers", "/zh/admin/customers", True),
]

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME)
    ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
    ctx.add_cookies(cookies)
    page = ctx.new_page()

    for name, url, full in pages:
        try:
            page.goto(BASE + url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(2500)
            page.screenshot(path=f"{OUT}/{name}.png", full_page=full)
            print("📸", name, "→", url)
        except Exception as e:
            print("❌", name, e)

    # 商品表单：点「新增商品」展开弹窗，截赠券配置区
    try:
        page.goto(BASE + "/zh/admin/products", wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2500)
        page.evaluate("""() => {
          const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('新增商品'));
          if (b) b.click();
        }""")
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{OUT}/fix-05-product-form.png", full_page=True)
        print("📸 fix-05-product-form（新增商品弹窗）")
    except Exception as e:
        print("❌ 商品弹窗", e)

    # 后台订单：展开第一个订单看积分行
    try:
        page.goto(BASE + "/zh/admin/orders", wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2500)
        page.evaluate("""() => {
          const b = [...document.querySelectorAll('button, select, span, div')].find(x => x.textContent.trim() === '待处理');
          if (b) b.click();
        }""")
        page.wait_for_timeout(800)
        page.screenshot(path=f"{OUT}/fix-06-order-detail.png", full_page=True)
        print("📸 fix-06-order-detail（订单详情积分行）")
    except Exception as e:
        print("❌ 订单详情", e)

    browser.close()

print("完成")
