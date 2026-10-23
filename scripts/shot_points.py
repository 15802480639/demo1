"""积分功能可视化截图。

用法：
    python scripts/shot_points.py
输出：_review-shots/points-*.png
"""
import os
import sys
import time
import urllib.request
import urllib.parse
import json
import http.cookiejar

BASE = "http://127.0.0.1:3000"
OUT = "_review-shots"
CHROME = r"C:\Users\Administrator\AppData\Local\ms-playwright\chromium-1248\chrome-win64\chrome.exe"

os.makedirs(OUT, exist_ok=True)

from playwright.sync_api import sync_playwright

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def api(path, data=None, method=None):
    """用 cookie jar 发请求（跨页面共享登录态）"""
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


def main():
    # 1. 注册测试用户
    u = "pv" + str(int(time.time()))[-8:]
    r = api("/api/auth/register", {
        "username": u, "email": f"{u}@test.com",
        "password": "Test1234!", "name": "演示用户",
    })
    print("注册:", r.get("ok"))
    api("/api/auth/login", {"account": u, "password": "Test1234!"})

    # 2. 管理员登录 → 给该用户发积分
    api("/api/auth/login", {"email": "admin@shop.com", "password": "admin1234"})
    cs = api("/api/admin/customers")
    cust = next((c for c in cs.get("customers", []) if (c.get("email") or "").startswith("pv")), None)
    if cust:
        api(f"/api/admin/customers/{cust['id']}/points",
            {"amount": 52000, "remark": "活动赠送"})
        print("已发积分 52000 给", cust.get("email"))

        # 顺便发一张优惠券，让「我的优惠券」页有内容
        cpl = api("/api/admin/coupons")
        first = (cpl.get("coupons") or [None])[0]
        if first:
            g = api(f"/api/admin/customers/{cust['id']}/coupons", {"couponId": first["id"]})
            print("已发券", first.get("code"), "→", g.get("ok"))

    # 3. 切回用户（前台截图用）
    api("/api/auth/login", {"account": u, "password": "Test1234!"})

    # 把 cookie 注入 playwright
    def current_cookies():
        cs = []
        for c in jar:
            cs.append({
                "name": c.name, "value": c.value, "domain": "127.0.0.1", "path": "/",
            })
        return cs

    user_cookies = current_cookies()

    # 4. 后台页需要管理员 —— 单独一份 cookie
    api("/api/auth/login", {"email": "admin@shop.com", "password": "admin1234"})
    admin_cookies = current_cookies()

    pages = [
        ("points-01-account", "/zh/account", True, user_cookies),
        ("points-02-points-center", "/zh/account/points", True, user_cookies),
        ("points-03-coupons", "/zh/account/coupons", True, user_cookies),
        ("points-04-admin-points", "/zh/admin/points", True, admin_cookies),
        ("points-05-admin-customers", "/zh/admin/customers", False, admin_cookies),
        ("points-06-admin-orders", "/zh/admin/orders", False, admin_cookies),
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME)
        for name, url, full, ck in pages:
            ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
            ctx.add_cookies(ck)
            page = ctx.new_page()
            try:
                page.goto(BASE + url, wait_until="networkidle", timeout=30000)
                page.wait_for_timeout(800)
                page.screenshot(path=f"{OUT}/{name}.png", full_page=full)
                print("📸", name, "→", url)
            except Exception as e:
                print("❌", name, e)
            ctx.close()
        browser.close()
    print("完成")


if __name__ == "__main__":
    main()
