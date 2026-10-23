'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';
import { useCart, cartTotal } from '@/lib/cart-store';
import { useAuth } from '@/components/auth/auth-provider';
import { formatPrice } from '@/lib/format';

type Placed = {
  orderNo: string;
  total: number;
  subtotal: number;
  shippingFee: number;
  pointsUsed: number;
  pointsDiscount: number;
  items: { name: string; price: number; quantity: number; imageUrl: string | null; skuLabel: string | null }[];
};

type PointQuote = {
  ok: boolean;
  reason?: string;
  rule: {
    enabled: boolean;
    earnPercent: number;
    minSpendForUse: number;
    pointsPerKrw: number;
    maxUsePercent: number;
  };
  userPoints: number;
  maxPoints: number;
  maxDiscount: number;
  eligible: boolean;
  onePointValue: number;
};

export default function CheckoutPage() {
  const { locale, dict } = useLocale();
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const { user } = useAuth();
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [form, setForm] = useState(() => ({
    name: '',
    phone: '',
    email: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    country: dict.checkout.countryDefault,
    postalCode: '',
  }));

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const [coupon, setCoupon] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [discount, setDiscount] = useState(0);
  // 账户里的优惠券（可直接点选）
  const [myCoupons, setMyCoupons] = useState<
    { id: string; code: string; type: string; value: number; minSpend: number; status: string }[]
  >([]);

  // 拉取账户优惠券
  useEffect(() => {
    if (!user) return;
    fetch('/api/account/coupons')
      .then((r) => r.json())
      .then((d) => {
        const usable = (d.coupons ?? []).filter((c: any) => c.status === 'available');
        setMyCoupons(usable);
      })
      .catch(() => {});
  }, [user]);

  // ---- 积分 ----
  const [quote, setQuote] = useState<PointQuote | null>(null);
  const [usePoints, setUsePoints] = useState(0);
  const [pointsOpen, setPointsOpen] = useState(false);

  /** 拉取积分试算（购物车或优惠券变化时都要重算） */
  const refreshQuote = useCallback(async () => {
    if (!user || lines.length === 0) {
      setQuote(null);
      return;
    }
    try {
      const res = await fetch('/api/account/points/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((l) => ({ slug: l.slug, qty: l.qty, price: l.price })),
        }),
      });
      const d = await res.json();
      if (d?.ok) {
        setQuote(d);
        // 超出上限时自动收敛
        setUsePoints((prev) => Math.min(prev, d.maxPoints));
      } else {
        setQuote(null);
      }
    } catch {
      setQuote(null);
    }
  }, [user, lines]);

  useEffect(() => {
    refreshQuote();
  }, [refreshQuote]);

  async function applyCoupon() {
    setCouponMsg('');
    if (!coupon.trim()) {
      setDiscount(0);
      return;
    }
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: coupon,
        subtotal: total,
        items: lines.map((l) => ({ slug: l.slug, price: l.price, qty: l.qty })),
      }),
    });
    const d = await res.json();
    if (d.ok) {
      setDiscount(d.discount);
      setCouponMsg(
        dict.checkout.couponApplied +
          d.discount.toLocaleString() +
          ' ₩' +
          (d.applicableOnly ? ' ' + dict.checkout.couponLimited : ''),
      );
    } else {
      setDiscount(0);
      setCouponMsg(
        d.error === 'EXPIRED'
          ? dict.checkout.couponExpired
          : d.error === 'NOT_APPLICABLE'
            ? dict.checkout.couponNotApplicable
            : dict.checkout.couponInvalid,
      );
    }
  }

  // 登录用户预填邮箱与默认地址
  useEffect(() => {
    if (!user) return;
    setForm((f) => (f.email ? f : { ...f, email: user.email ?? '' }));
    if (form.line1) return;
    fetch('/api/account/addresses')
      .then((r) => r.json())
      .then((d) => {
        const addrs = d.addresses || [];
        const def = addrs.find((a: any) => a.isDefault) || addrs[0];
        if (def) {
          setForm((f) => ({
            ...f,
            name: def.name || f.name,
            email: user?.email || f.email,
            line1: def.line1,
            line2: def.line2 || '',
            city: def.city,
            state: def.state || '',
            country: def.country,
            postalCode: def.postalCode,
            phone: def.phone || '',
          }));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const total = cartTotal(lines);
  // 积分抵扣金额：向下取整由服务端再校验一次，这里只做显示
  const pointsDiscount =
    quote && usePoints > 0 ? Math.floor((usePoints * 100) / quote.rule.pointsPerKrw) : 0;
  const payable = Math.max(0, total - discount - pointsDiscount);
  const shippingFee = payable >= 100000 || total === 0 ? 0 : 3000;
  const grand = payable + shippingFee;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (lines.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((l) => ({
            slug: l.slug,
            size: l.size,
            options: l.options,
            qty: l.qty,
          })),
          shipping: form,
          couponCode: discount > 0 ? coupon.trim().toUpperCase() : undefined,
          usePoints: usePoints > 0 ? usePoints : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.startsWith('STOCK:')) {
          const item = data.error.replace('STOCK:', '');
          setErr(`${item} ${dict.checkout.insufficientStock}`);
        } else {
          setErr(dict.checkout.orderFailed);
        }
        return;
      }
      clear();
      setPlaced(data.order);
    } catch {
      setErr(dict.checkout.orderFailed);
    } finally {
      setLoading(false);
    }
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-[700px] px-4 sm:px-8 py-24 text-center">
        <div className="font-display text-5xl text-accent mb-4">✓</div>
        <h1 className="font-display text-4xl text-ink mb-3">
          {dict.checkout.orderComplete}
        </h1>
        <p className="text-muted mb-1">
          {dict.checkout.orderNo}:{' '}
          <span className="text-ink">{placed.orderNo}</span>
        </p>
        <div className="text-left border border-line mt-8 p-6 space-y-3">
          {placed.items.map((it, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-ink-soft">
                {it.name}
                {it.skuLabel ? ` (${it.skuLabel})` : ''} × {it.quantity}
              </span>
              <span>{formatPrice(it.price * it.quantity, locale)}</span>
            </div>
          ))}
          {placed.pointsDiscount > 0 && (
            <div className="flex justify-between text-sm text-accent">
              <span>
                {locale === 'zh'
                  ? `积分抵扣（${placed.pointsUsed.toLocaleString()} 分）`
                  : locale === 'en'
                    ? `Points used (${placed.pointsUsed.toLocaleString()})`
                    : `포인트 사용 (${placed.pointsUsed.toLocaleString()}P)`}
              </span>
              <span>-{formatPrice(placed.pointsDiscount, locale)}</span>
            </div>
          )}
          <div className="luxe-rule my-3" />
          <div className="flex justify-between font-medium">
            <span>{dict.common.price}</span>
            <span className="font-display text-2xl">
              {formatPrice(placed.total, locale)}
            </span>
          </div>
        </div>
        <div className="mt-8 flex gap-3 justify-center">
          {user && (
            <Link href={`/${locale}/account/orders`} className="btn-outline">
              {dict.checkout.myOrders}
            </Link>
          )}
          <Link href={`/${locale}`} className="btn-gold">
            {dict.checkout.continueShopping}
          </Link>
        </div>
      </div>
    );
  }

  // 未登录：不允许结算，引导注册/登录
  if (!user) {
    return (
      <div className="mx-auto max-w-[560px] px-4 sm:px-8 py-24 text-center">
        <h1 className="font-display text-3xl text-ink mb-3">
          {dict.checkout.loginRequired}
        </h1>
        <p className="text-sm text-muted mb-8">
          {dict.checkout.loginRequiredDesc}
        </p>
        <div className="flex gap-3 justify-center">
          <Link href={`/${locale}/register`} className="btn-gold">
            {dict.checkout.goRegister}
          </Link>
          <Link href={`/${locale}/login`} className="btn-outline">
            {dict.checkout.goLogin}
          </Link>
        </div>
      </div>
    );
  }

  const field = (k: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="text-xs tracking-widest text-muted">{label}</label>
      <input
        type={type}
        value={form[k]}
        onChange={set(k)}
        className="w-full border border-line bg-surface px-4 py-3 outline-none focus:border-accent transition-colors mt-1"
        required={k !== 'line2' && k !== 'state'}
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-[1000px] px-4 sm:px-8 py-12">
      <h1 className="font-display text-4xl sm:text-6xl text-ink mb-8">
        {dict.common.buyNow}
      </h1>

      {lines.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted mb-6">{dict.checkout.emptyCart}</p>
          <Link href={`/${locale}/products`} className="btn-gold">
            {dict.nav.shop}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-3 space-y-4">
            {field('name', dict.account.recipient)}
            {field('phone', dict.account.phone)}
            {field('email', dict.account.email, 'email')}
            {field('line1', dict.account.addressLabel)}
            {field('line2', dict.account.address2Label)}
            <div className="grid grid-cols-2 gap-4">
              {field('city', dict.account.city)}
              {field('postalCode', dict.account.postal)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {field('state', dict.account.state)}
              {field('country', dict.account.country)}
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
          </div>

          <div className="md:col-span-2 border border-line p-6 h-fit">
            <h2 className="font-display text-2xl text-ink mb-4">
              {dict.nav.cart}
            </h2>
            <div className="space-y-3 text-sm">
              {lines.map((l) => (
                <div key={`${l.slug}-${l.size ?? ''}`} className="flex justify-between">
                  <span className="text-ink-soft truncate pr-2">
                    {l.name}
                    {l.size ? ` (${l.size})` : ''} × {l.qty}
                  </span>
                  <span>{formatPrice(l.price * l.qty, locale)}</span>
                </div>
              ))}
            </div>
            <div className="luxe-rule my-4" />
            <div className="flex justify-between text-sm text-muted">
              <span>{dict.common.price}</span>
              <span>{formatPrice(total, locale)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted mt-1">
              <span>{dict.common.freeShipping}</span>
              <span>{formatPrice(shippingFee, locale)}</span>
            </div>

            {/* coupon */}
            <div className="mt-4">
              {/* 账户里的优惠券可直接点选 */}
              {myCoupons.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {myCoupons.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCoupon(c.code);
                        setCouponMsg('');
                        // 立刻试算
                        setTimeout(() => {
                          const el = document.getElementById('coupon-apply-btn');
                          (el as HTMLButtonElement | null)?.click();
                        }, 0);
                      }}
                      className={`text-xs px-2.5 py-1 border transition-colors ${
                        coupon === c.code
                          ? 'border-accent bg-accent text-white'
                          : 'border-line text-accent hover:border-accent'
                      }`}
                      title={
                        c.type === 'percent'
                          ? `${c.value}% 折扣`
                          : `减 ₩${c.value.toLocaleString()}`
                      }
                    >
                      {c.code}
                      {c.minSpend > 0 && (
                        <span className="opacity-70 ml-1">
                          (满{c.minSpend.toLocaleString()})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder={dict.checkout.couponPlaceholder}
                  className="flex-1 border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  id="coupon-apply-btn"
                  type="button"
                  onClick={applyCoupon}
                  className="btn-outline text-sm px-4"
                >
                  {dict.checkout.apply}
                </button>
              </div>
              {couponMsg && (
                <p className={`text-xs mt-1 ${discount > 0 ? 'text-accent' : 'text-red-600'}`}>
                  {couponMsg}
                </p>
              )}
            </div>

            {/* ---------- 积分抵扣 ---------- */}
            {quote?.rule?.enabled && (
              <div className="mt-4 border border-line bg-surface p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs tracking-widest text-muted">
                    {locale === 'zh' ? '使用积分' : locale === 'en' ? 'Use points' : '포인트 사용'}
                  </span>
                  <span className="text-xs">
                    {locale === 'zh'
                      ? `可用 ${quote.userPoints.toLocaleString()} 分`
                      : locale === 'en'
                        ? `${quote.userPoints.toLocaleString()} pts`
                        : `${quote.userPoints.toLocaleString()}P 사용 가능`}
                  </span>
                </div>

                {quote.eligible ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPointsOpen((v) => !v)}
                      className="w-full mt-2 flex items-center justify-between border border-line px-3 py-2 text-sm hover:border-accent transition-colors"
                    >
                      <span className={usePoints > 0 ? 'text-accent' : 'text-ink-soft'}>
                        {usePoints > 0
                          ? locale === 'zh'
                            ? `已用 ${usePoints.toLocaleString()} 分，抵 ${formatPrice(pointsDiscount, locale)}`
                            : locale === 'en'
                              ? `${usePoints.toLocaleString()} pts used (−${formatPrice(pointsDiscount, locale)})`
                              : `${usePoints.toLocaleString()}P 사용 (${formatPrice(pointsDiscount, locale)} 할인)`
                          : locale === 'zh'
                            ? `本单最多可用 ${quote.maxPoints.toLocaleString()} 分（抵 ${formatPrice(quote.maxDiscount, locale)}）`
                            : locale === 'en'
                              ? `Up to ${quote.maxPoints.toLocaleString()} pts (${formatPrice(quote.maxDiscount, locale)})`
                              : `최대 ${quote.maxPoints.toLocaleString()}P 사용 가능 (${formatPrice(quote.maxDiscount, locale)})`}
                      </span>
                      <span className="text-muted text-xs">{pointsOpen ? '▲' : '▼'}</span>
                    </button>

                    {pointsOpen && (
                      <div className="mt-3">
                        <input
                          type="number"
                          min={0}
                          max={quote.maxPoints}
                          value={usePoints}
                          onChange={(e) => {
                            const n = Math.max(0, Math.min(quote.maxPoints, Math.floor(Number(e.target.value) || 0)));
                            setUsePoints(n);
                          }}
                          className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
                        />
                        <div className="flex justify-between mt-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setUsePoints(0)}
                            className="text-xs text-muted hover:text-ink px-2"
                          >
                            {locale === 'zh' ? '不使用' : locale === 'en' ? 'Clear' : '사용 안 함'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setUsePoints(quote.maxPoints)}
                            className="text-xs text-accent hover:underline px-2"
                          >
                            {locale === 'zh' ? '全部使用' : locale === 'en' ? 'Use all' : '전체 사용'}
                          </button>
                        </div>
                        <p className="text-[11px] text-muted mt-1">
                          {locale === 'zh'
                            ? `${quote.rule.pointsPerKrw.toLocaleString()} 积分 = 1₩，单笔最多抵订单金额的 ${quote.rule.maxUsePercent}%。`
                            : locale === 'en'
                              ? `${quote.rule.pointsPerKrw} pts = ₩1. Up to ${quote.rule.maxUsePercent}% of order value.`
                              : `${quote.rule.pointsPerKrw}P = ₩1, 주문 금액의 최대 ${quote.rule.maxUsePercent}%까지 사용 가능`}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] text-muted mt-2">
                    {quote.reason === 'BELOW_MIN'
                      ? locale === 'zh'
                        ? `订单实付满 ${quote.rule.minSpendForUse.toLocaleString()}₩ 才能使用积分。`
                        : locale === 'en'
                          ? `Use points on orders over ₩${quote.rule.minSpendForUse.toLocaleString()}.`
                          : `₩${quote.rule.minSpendForUse.toLocaleString()} 이상 주문에서 포인트 사용 가능`
                      : quote.reason === 'NO_POINTS'
                        ? locale === 'zh'
                          ? '你还没有积分，购买商品后可获得。'
                          : locale === 'en'
                            ? 'You have no points yet. Earn them by shopping.'
                            : '아직 포인트가 없습니다. 구매 후 적립됩니다.'
                        : locale === 'zh'
                          ? '本单商品不支持积分抵扣。'
                          : locale === 'en'
                            ? 'Items in this order cannot be paid with points.'
                            : '이 주문의 상품은 포인트 결제를 사용할 수 없습니다.'}
                  </p>
                )}
              </div>
            )}

            {discount > 0 && (
              <div className="flex justify-between text-sm text-accent mt-3">
                <span>{dict.checkout.discountLabel}</span>
                <span>-{formatPrice(discount, locale)}</span>
              </div>
            )}
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-sm text-accent mt-1">
                <span>
                  {locale === 'zh'
                    ? `积分抵扣（${usePoints.toLocaleString()} 分）`
                    : locale === 'en'
                      ? `Points used (${usePoints.toLocaleString()})`
                      : `포인트 사용 (${usePoints.toLocaleString()}P)`}
                </span>
                <span>-{formatPrice(pointsDiscount, locale)}</span>
              </div>
            )}
            <div className="luxe-rule my-4" />
            <div className="flex justify-between font-medium">
              <span>{dict.common.price}</span>
              <span className="font-display text-2xl">
                {formatPrice(grand, locale)}
              </span>
            </div>
            {quote?.rule?.enabled && quote.eligible && (
              <p className="text-[11px] text-muted mt-1 text-right">
                {locale === 'zh'
                  ? `本单还将获得约 ${Math.floor((grand * quote.rule.earnPercent) / 100).toLocaleString()} 积分`
                  : locale === 'en'
                    ? `You'll earn about ${Math.floor((grand * quote.rule.earnPercent) / 100).toLocaleString()} points`
                    : `약 ${Math.floor((grand * quote.rule.earnPercent) / 100).toLocaleString()}P 적립 예정`}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full mt-6"
            >
              {loading ? '…' : dict.common.buyNow}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
