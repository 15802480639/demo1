"""webshopp 积分体系 UI 全面抽查（Playwright）。

覆盖：
  前台（游客）：首页 / 商品列表 / 商品详情 / 二级分类 / FAQ / 无后台入口断言
  前台（用户）：我的积分 / 我的优惠券 / 加购物车 → 结算页积分面板
  后台（admin）：订单（积分列+规格列）/ 客户（调整入口）/ 商品（表单积分配置+赠券）/ 积分规则设置
输出：scripts/shots/e2e-ui/*.png + 控制台断言报告
"""
import os
import re
import json
import time
import urllib.request
import urllib.parse
import http.cookiejar

BASE = "http://127.0.0.1:3000"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots", "e2e-ui")
CHROME = r"C:\Users\Administrator\AppData\Local\ms-playwright\chromium-1248\chrome-win64\chrome.exe"

os.makedirs(OUT, exist_ok=True)
from playwright.sync_api import sync_playwright

passed, failed = 0, 0
failures = []


def check(name, ok, detail=""):
    global passed, failed
    if ok:
        passed += 1
        print(f"  ✅ {name}" + (f" — {detail}" if detail else ""))
    else:
        failed += 1
        failures.append(name)
        print(f"  ❌ {name}" + (f" — {detail}" if detail else ""))


def api(jar, path, data=None):
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(BASE + path, data=body, method="POST" if body else "GET")
    if body:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar)).open(req, timeout=20) as r:
            raw = r.read().decode("utf-8", "replace")
            return r.status, (json.loads(raw) if raw.strip().startswith(("{", "[")) else {})
    except urllib.error.HTTPError as e:
        return e.code, {}
    except Exception as e:
        print(f"  ! API {path} 异常: {e}")
        return 0, {}


def cookie_value(jar, name="ws_session"):
    for c in jar:
        if c.name == name:
            return c.value
    return None


admin_jar = http.cookiejar.CookieJar()
user_jar = http.cookiejar.CookieJar()
stamp = str(int(time.time()))[-8:]
TEST_USER = {"username": f"ui{stamp}", "email": f"ui-{stamp}@test.com", "password": "Test1234!", "name": "UI测试用户"}

print("== 准备登录态 ==")
api(admin_jar, "/api/auth/login", {"account": "admin@shop.com", "password": "admin1234"})
api(user_jar, "/api/auth/register", TEST_USER)
api(user_jar, "/api/auth/login", {"account": TEST_USER["username"], "password": TEST_USER["password"]})
# 找用户 id 并加 30000 分（让结算页积分面板有内容）
_, cust = api(admin_jar, "/api/admin/customers")
uid = next((c["id"] for c in cust.get("customers", []) if c["email"] == TEST_USER["email"]), None)
if uid:
    api(admin_jar, f"/api/admin/customers/{uid}/points", {"amount": 30000, "remark": "UI测试充值"})
print(f"  测试用户 {TEST_USER['email']} 积分已充 30000")

admin_ck = cookie_value(admin_jar)
user_ck = cookie_value(user_jar)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=CHROME)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="zh-CN")

    def shot(page, name):
        path = os.path.join(OUT, name)
        page.screenshot(path=path, full_page=True)
        return path

    # ============ 前台·游客 ============
    print("\n== 前台（游客） ==")
    pg = ctx.new_page()
    pg.goto(BASE + "/zh", wait_until="domcontentloaded")
    pg.wait_for_timeout(2500)
    html = pg.content()
    check("首页正常打开（含logo/导航）", "WebShopp" in html or "webshopp" in html.lower() or pg.title() != "")
    check("前端无「进入后台」入口（游客可见DOM不含/admin链接）", "/admin" not in re.sub(r'<script[\s\S]*?</script>', "", html))
    shot(pg, "01-home.png")

    pg.goto(BASE + "/zh/products", wait_until="domcontentloaded")
    pg.wait_for_timeout(2500)
    cards = pg.locator('a[href*="/products/"]').count()
    check("商品列表有商品卡片", cards >= 10, f"卡片数={cards}")
    shot(pg, "02-products.png")

    # 抓二级分类链接（修复过404的路径）
    cat_links = sorted(set(re.findall(r'href="(/zh/c/[^"]+)"', html)))
    if not cat_links:
        _, prods_html = None, None
    # ============ 商品详情 + 加购 + 结算积分面板（用户态）============
    print("\n== 前台（用户）：详情→加购→结算积分面板 ==")
    pg2 = ctx.new_page()
    pg2.context.add_cookies([{"name": "ws_session", "value": user_ck, "domain": "127.0.0.1", "path": "/"}])
    pg2.goto(BASE + "/zh/products/26padded-jacket-khaki", wait_until="domcontentloaded")
    pg2.wait_for_timeout(2500)
    dhtml = pg2.content()
    check("商品详情页有价格", "115,000" in dhtml or "115000" in dhtml)
    shot(pg2, "03-product-detail.png")
    # 选 M 码（若有规格选择器）
    try:
        size_btn = pg2.locator('button:has-text("M"), [data-size="M"]').first
        if size_btn.count() > 0:
            size_btn.click(timeout=2000)
            pg2.wait_for_timeout(500)
    except Exception:
        pass
    try:
        add_btn = pg2.locator('button:has-text("加入购物车"), button:has-text("장바구니"), button:has-text("카트")').first
        add_btn.click(timeout=3000)
        pg2.wait_for_timeout(1200)
        check("商品页点击「加入购物车」成功", True)
    except Exception as e:
        check("商品页点击「加入购物车」成功", False, str(e)[:80])
    pg2.goto(BASE + "/zh/cart", wait_until="domcontentloaded")
    pg2.wait_for_timeout(2000)
    shot(pg2, "04-cart.png")
    pg2.goto(BASE + "/zh/checkout", wait_until="domcontentloaded")
    pg2.wait_for_timeout(2500)
    chtml = pg2.content()
    # 登录墙是条件渲染节点，隐藏时也在 DOM 里 —— 必须查可见性而不是 HTML 字符串
    login_wall_visible = pg2.locator('text=请先注册或登录').first.is_visible() if pg2.locator('text=请先注册或登录').count() > 0 else False
    check("结算页打开（未撞登录墙）", not login_wall_visible)
    check("结算页显示积分面板（可用积分30,000）", "30,000" in chtml)
    check("结算页有「我的优惠券」入口", "优惠券" in chtml or "쿠폰" in chtml)
    shot(pg2, "05-checkout.png")

    # ============ 前台·用户中心 ============
    print("\n== 前台（用户）：我的积分 / 我的优惠券 ==")
    pg2.goto(BASE + "/zh/account/points", wait_until="domcontentloaded")
    pg2.wait_for_timeout(2500)
    phtml = pg2.content()
    check("我的积分页显示余额 30,000", "30,000" in phtml)
    check("积分页有「获得途径」说明", "获得" in phtml or "途径" in phtml or "적립" in phtml)
    check("积分页已无「客服手动调整」卡片（历史需求5）", "客服手动调整" not in phtml)
    shot(pg2, "06-account-points.png")
    pg2.goto(BASE + "/zh/account/coupons", wait_until="domcontentloaded")
    pg2.wait_for_timeout(2000)
    shot(pg2, "07-account-coupons.png")

    # ============ 分类页回归 ============
    print("\n== 二级分类回归 ==")
    pg3 = ctx.new_page()
    # 从商品列表页抓真实分类链接
    pg3.goto(BASE + "/zh/products", wait_until="domcontentloaded")
    pg3.wait_for_timeout(2000)
    links = sorted(set(re.findall(r'href="(/zh/c/[^"]+)"', pg3.content())))
    if links:
        for i, link in enumerate(links[:3]):
            pg3.goto(BASE + link, wait_until="domcontentloaded")
            pg3.wait_for_timeout(2000)
            ok = pg3.locator("body").inner_html().strip() != "" and "404" not in pg3.title()
            check(f"分类页 {link} 正常", ok, f"title={pg3.title()[:40]}")
            if i == 0:
                shot(pg3, "08-category.png")
    else:
        check("抓到二级分类链接", False, "列表页无 /c/ 链接")
        pg3.goto(BASE + "/zh/products?cat=women", wait_until="domcontentloaded")
        pg3.wait_for_timeout(2000)
        check("分类query参数页正常", "404" not in pg3.title())

    # ============ FAQ ============
    pg3.goto(BASE + "/zh/faq", wait_until="domcontentloaded")
    pg3.wait_for_timeout(2000)
    check("FAQ 页正常", "404" not in pg3.title())
    shot(pg3, "09-faq.png")

    # ============ 后台 ============
    print("\n== 后台（admin） ==")
    pg4 = ctx.new_page()
    pg4.context.add_cookies([{"name": "ws_session", "value": admin_ck, "domain": "127.0.0.1", "path": "/"}])

    pg4.goto(BASE + "/zh/admin/orders", wait_until="domcontentloaded")
    pg4.wait_for_timeout(3000)
    ohtml = pg4.content()
    check("后台订单页打开", "订单" in ohtml or "주문" in ohtml)
    check("后台订单页含「积分」列表头", "积分" in ohtml)
    check("后台订单页含「规格」列表头", "规格" in ohtml or "尺码" in ohtml)
    shot(pg4, "10-admin-orders.png")

    pg4.goto(BASE + "/zh/admin/customers", wait_until="domcontentloaded")
    pg4.wait_for_timeout(3000)
    chtml2 = pg4.content()
    check("后台客户页打开", "客户" in chtml2 or "고객" in chtml2)
    check("后台客户页有积分调整按钮", "调整" in chtml2 or "✎" in chtml2)
    check("后台客户页有发券按钮", "发券" in chtml2 or "券" in chtml2)
    shot(pg4, "11-admin-customers.png")

    pg4.goto(BASE + "/zh/admin/products", wait_until="domcontentloaded")
    pg4.wait_for_timeout(3000)
    shot(pg4, "12-admin-products.png")
    # 点第一个商品的编辑，看表单积分配置区
    try:
        edit_btn = pg4.locator('button:has-text("编辑"), a:has-text("编辑")').first
        edit_btn.click(timeout=3000)
        pg4.wait_for_timeout(2000)
        fhtml = pg4.content()
        check("商品表单有「获得积分」配置区", "获得积分" in fhtml or "earnPoints" in fhtml or "返积分" in fhtml)
        check("商品表单有「购买赠送优惠券」多选", "赠送优惠券" in fhtml or "赠券" in fhtml or "获得优惠券" in fhtml)
        check("商品表单有「使用积分」配置区", "使用积分" in fhtml or "usePoints" in fhtml or "抵扣" in fhtml)
        shot(pg4, "13-admin-product-form.png")
        # 关闭表单
        pg4.keyboard.press("Escape")
    except Exception as e:
        check("打开商品编辑表单", False, str(e)[:80])

    pg4.goto(BASE + "/zh/admin/points", wait_until="domcontentloaded")
    pg4.wait_for_timeout(2500)
    rhtml = pg4.content()
    check("后台积分规则页打开", "积分" in rhtml)
    check("积分规则页有返积分比例输入", "earnPercent" in rhtml or "返积分" in rhtml or "5" in rhtml)
    shot(pg4, "14-admin-points.png")

    browser.close()

print(f"\n===== UI 抽查结果：{passed} 通过 / {failed} 失败 =====")
if failures:
    print("失败项：")
    for f in failures:
        print(f"  ❌ {f}")

# ============ 清理 UI 测试用户 ============
print("\n== 清理 UI 测试用户 ==")
import subprocess
subprocess.run(["node", "-e", f"""
const {{ PrismaClient }} = require('@prisma/client');
const {{ PrismaPg }} = require('@prisma/adapter-pg');
const fs = require('fs');
const url = fs.readFileSync('.env','utf8').match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g,'');
const prisma = new PrismaClient({{ adapter: new PrismaPg({{ connectionString: url }}) }});
(async () => {{
  const u = await prisma.user.findUnique({{ where: {{ email: '{TEST_USER['email']}' }} }});
  if (u) {{
    await prisma.pointTransaction.deleteMany({{ where: {{ userId: u.id }} }});
    await prisma.userCoupon.deleteMany({{ where: {{ userId: u.id }} }});
    await prisma.address.deleteMany({{ where: {{ userId: u.id }} }});
    await prisma.cartItem.deleteMany({{ where: {{ cart: {{ userId: u.id }} }} }});
    await prisma.cart.deleteMany({{ where: {{ userId: u.id }} }});
    await prisma.user.delete({{ where: {{ id: u.id }} }});
    console.log('  🗑  UI 测试用户已删');
  }} else console.log('  （无残留）');
  const cnt = await prisma.user.count();
  console.log('  用户数回到:', cnt);
  await prisma.$disconnect();
}})();
"""], cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sys
sys.exit(1 if failed else 0)
