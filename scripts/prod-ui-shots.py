import os, json, time, urllib.request, http.cookiejar
BASE = 'http://www.mk.golf'
HOST = None
OUT = 'D:/LuoshenWorkspace/code/webshopp/scripts/shots/prod-ui'
os.makedirs(OUT, exist_ok=True)
CHROME = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

jar = http.cookiejar.CookieJar()
def api(path, data=None, method=None):
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(BASE + path, data=body, method=method or ('POST' if body else 'GET'))
    
    if body:
        req.add_header('Content-Type', 'application/json')
    with urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar)).open(req, timeout=20) as r:
        return json.loads(r.read().decode())

api('/api/auth/login', {'account': 'admin@shop.com', 'password': 'admin1234'})
admin_ck = [c for c in jar if c.name == 'ws_session'][0].value

from playwright.sync_api import sync_playwright
results = []
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, executable_path=CHROME)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, )
    pg = ctx.new_page()
    def shot(url, name, wait=2500):
        pg.goto(BASE + url, wait_until='domcontentloaded')
        pg.wait_for_timeout(wait)
        pg.screenshot(path=f'{OUT}/{name}.png', full_page=True, timeout=60000)
        html = pg.content()
        return html
    # 1. 首页
    h = shot('/ko', '01-home')
    results.append(('首页加载', 'J&D' in h or 'mk.golf' in h))
    # 2. 商品详情
    h = shot('/ko/products/26padded-jacket-khaki', '02-product')
    results.append(('商品详情-价格', '115,000' in h))
    results.append(('商品详情-加购按钮', '장바구니' in h or '카트' in h or '加入' in h))
    # 3. 分类页
    h = shot('/ko/c/onepiece', '03-category')
    results.append(('分类页有商品', 'JUMPSUIT' in h.upper() or '점프수트' in h))
    # 4. 商品列表
    h = shot('/ko/products', '04-products')
    results.append(('列表页多商品', h.count('products/') >= 5))
    # 后台
    ctx.add_cookies([{'name': 'ws_session', 'value': admin_ck, 'domain': '127.0.0.1', 'path': '/'}])
    pg2 = ctx.new_page()
    pg2.goto(BASE + '/ko/admin/orders', wait_until='domcontentloaded')
    pg2.wait_for_timeout(3000)
    pg2.screenshot(path=f'{OUT}/05-admin-orders.png', full_page=True, timeout=60000)
    h = pg2.content()
    results.append(('后台订单页', '주문' in h or '订单' in h or 'ORDER' in h.upper()))
    pg2.goto(BASE + '/ko/admin/points', wait_until='domcontentloaded')
    pg2.wait_for_timeout(3000)
    pg2.screenshot(path=f'{OUT}/06-admin-points.png', full_page=True, timeout=60000)
    h = pg2.content()
    results.append(('后台积分设置页', '5' in h and ('적립' in h or '积分' in h or '포인트' in h)))
    pg2.goto(BASE + '/ko/admin/products', wait_until='domcontentloaded')
    pg2.wait_for_timeout(3000)
    pg2.screenshot(path=f'{OUT}/07-admin-products.png', full_page=True, timeout=60000)
    h = pg2.content()
    results.append(('后台商品列表含新商品', 'JACKET' in h.upper() or 'JUMPSUIT' in h.upper()))
    b.close()

ok = sum(1 for _, r in results if r)
for name, r in results:
    print(('✅ ' if r else '❌ ') + name)
print(f'=== UI抽查: {ok}/{len(results)} ===')
