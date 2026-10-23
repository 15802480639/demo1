"""结算页积分抵扣 + 后台订单规格显示 截图。

用法：python scripts/shot_checkout.py
"""
import os
import time
import json
import urllib.request
import http.cookiejar

BASE = "http://127.0.0.1:3000"
OUT = "_review-shots"
CHROME = r"C:\Users\Administrator\AppData\Local\ms-playwright\chromium-1248\chrome-win64\chrome.exe"
os.makedirs(OUT, exist_ok=True)

from playwright.sync_api import sync_playwright

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def api(path, data=None, method=None):
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(BASE + path, data=body, method=method or ("POST" if body else "GET"))
    if body:
        req.add_header("Content-Type", "application/json")
    try:
        with opener.open(req, timeout=20) as r:
            raw = r.read().decode("utf-8", "replace")
            return json.loads(raw) if raw.strip().startswith(("{", "[")) else {}
    except Exception as e:
        print(f"  ! {path}: {e}")
        return {}


def cookies():
    return [{"name": c.name, "value": c.value, "domain": "127.0.0.1", "path": "/"} for c in jar]


u = "ck" + str(int(time.time()))[-8:]
api("/api/auth/register", {"username": u, "email": f"{u}@test.com",
                            "password": "Test1234!", "name": "结算测试"})
api("/api/auth/login", {"account": u, "password": "Test1234!"})

# 管理员给积分
api("/api/auth/login", {"email": "admin@shop.com", "password": "admin1234"})
cs = api("/api/admin/customers")
cust = next((c for c in cs.get("customers", []) if (c.get("email") or "").startswith("ck")), None)
if cust:
    api(f"/api/admin/customers/{cust['id']}/points", {"amount": 80000, "remark": "测试额度"})
    print("已发积分 80000")

# 找一个贵商品 + 有库存
api("/api/auth/login", {"account": u, "password": "Test1234!"})
plist = api("/api/products?limit=60")
prods = sorted(plist.get("products", []), key=lambda p: -(p.get("price") or 0))
target = next((p for p in prods if (p.get("price") or 0) > 100000), prods[0] if prods else None)
if not target:
    print("没有商品")
    raise SystemExit(1)
print("测试商品:", target["slug"], target.get("price"))

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME)
    ctx = browser.new_context(viewport={"width": 1440, "height": 1100})
    ctx.add_cookies(cookies())
    page = ctx.new_page()

    # 注入购物车
    page.goto(BASE + "/zh/products", wait_until="networkidle")
    page.evaluate(
        """([slug, name, price]) => {
            localStorage.setItem('webshopp-cart', JSON.stringify({
                state: { lines: [{ slug, name, brandCode: '', price, qty: 1 }] },
                version: 0,
            }));
        }""",
        [target["slug"], target.get("name"), target.get("price")],
    )
    page.goto(BASE + "/zh/checkout", wait_until="networkidle")
    page.wait_for_timeout(1200)

    # 填地址
    for sel, val in [
        ("input[required]", "演示用户"),
    ]:
        pass
    inputs = page.locator("form input[required]")
    vals = ["演示用户", "010-1234-5678", f"{u}@test.com", "首尔市江南区 1 号", "首尔", "04524"]
    for i, v in enumerate(vals):
        if i < inputs.count():
            inputs.nth(i).fill(v)

    page.wait_for_timeout(1500)
    page.screenshot(path=f"{OUT}/points-07-checkout.png", full_page=True)
    print("📸 points-07-checkout")

    # 点开积分面板
    try:
        btn = page.locator("text=本单最多可用").first
        btn.click()
        page.wait_for_timeout(900)
        page.screenshot(path=f"{OUT}/points-08-checkout-points-open.png", full_page=True)
        print("📸 points-08-checkout-points-open")
    except Exception as e:
        print("积分面板未找到:", e)

    browser.close()
print("完成")
