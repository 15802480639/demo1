'use client';

import { useEffect, useState } from 'react';
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
  items: { name: string; price: number; quantity: number; imageUrl: string | null }[];
};

export default function CheckoutPage() {
  const { locale, dict } = useLocale();
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const { user } = useAuth();
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: user?.email ?? '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    country: '대한민국',
    postalCode: '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const [coupon, setCoupon] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [discount, setDiscount] = useState(0);

  async function applyCoupon() {
    setCouponMsg('');
    if (!coupon.trim()) {
      setDiscount(0);
      return;
    }
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: coupon, subtotal: total }),
    });
    const d = await res.json();
    if (d.ok) {
      setDiscount(d.discount);
      setCouponMsg('✓ -' + d.discount.toLocaleString() + ' ₩');
    } else {
      setDiscount(0);
      setCouponMsg(d.error === 'EXPIRED' ? '만료된 쿠폰' : '유효하지 않은 쿠폰');
    }
  }

  // 登录用户预填默认地址
  useEffect(() => {
    if (!user || form.line1) return;
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
  }, [user]);

  const total = cartTotal(lines);
  const shippingFee = total - discount >= 100000 || total === 0 ? 0 : 3000;
  const grand = Math.max(0, total - discount) + shippingFee;

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
          items: lines.map((l) => ({ slug: l.slug, size: l.size, qty: l.qty })),
          shipping: form,
          couponCode: discount > 0 ? coupon.trim().toUpperCase() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.startsWith('STOCK')) {
          setErr(
            locale === 'ko'
              ? `${data.error.replace('STOCK:', '')} 의 재고가 부족합니다`
              : `Insufficient stock: ${data.error.replace('STOCK:', '')}`,
          );
        } else {
          setErr(
            locale === 'ko'
              ? '주문 처리 중 오류가 발생했습니다'
              : 'Order failed. Please try again.',
          );
        }
        return;
      }
      clear();
      setPlaced(data.order);
    } catch {
      setErr('Order failed');
    } finally {
      setLoading(false);
    }
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-[700px] px-4 sm:px-8 py-24 text-center">
        <div className="font-display text-5xl text-accent mb-4">✓</div>
        <h1 className="font-display text-4xl text-ink mb-3">
          {dict.nav.account === '마이페이지' ? '주문 완료' : 'Order Complete'}
        </h1>
        <p className="text-muted mb-1">
          {dict.nav.account === '마이페이지' ? '주문번호' : 'Order No.'}:{' '}
          <span className="text-ink">{placed.orderNo}</span>
        </p>
        <div className="text-left border border-line mt-8 p-6 space-y-3">
          {placed.items.map((it, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-ink-soft">
                {it.name} × {it.quantity}
              </span>
              <span>{formatPrice(it.price * it.quantity, locale)}</span>
            </div>
          ))}
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
              {dict.nav.account === '마이페이지' ? '주문 내역' : 'My Orders'}
            </Link>
          )}
          <Link href={`/${locale}`} className="btn-gold">
            {dict.nav.home}
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
          <p className="text-muted mb-6">—</p>
          <Link href={`/${locale}/products`} className="btn-gold">
            {dict.nav.shop}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-3 space-y-4">
            {field('name', dict.nav.account)}
            {field('phone', 'Phone')}
            {field('email', 'Email', 'email')}
            {field('line1', 'Address')}
            {field('line2', 'Address 2 (optional)')}
            <div className="grid grid-cols-2 gap-4">
              {field('city', 'City')}
              {field('postalCode', 'Postal Code')}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {field('state', 'State / Region')}
              {field('country', 'Country')}
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
              <div className="flex gap-2">
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder={locale === 'ko' ? '쿠폰' : 'COUPON'}
                  className="flex-1 border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  className="btn-outline text-sm px-4"
                >
                  {locale === 'ko' ? '적용' : 'Apply'}
                </button>
              </div>
              {couponMsg && (
                <p className={`text-xs mt-1 ${discount > 0 ? 'text-accent' : 'text-red-600'}`}>
                  {couponMsg}
                </p>
              )}
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-sm text-accent mt-3">
                <span>{locale === 'ko' ? '할인' : 'Discount'}</span>
                <span>-{formatPrice(discount, locale)}</span>
              </div>
            )}
            <div className="luxe-rule my-4" />
            <div className="flex justify-between font-medium">
              <span>{dict.common.price}</span>
              <span className="font-display text-2xl">
                {formatPrice(grand, locale)}
              </span>
            </div>
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
