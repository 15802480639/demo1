'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartLine {
  slug: string;
  name: string;
  brandCode: string;
  price: number; // 韩元 ₩
  image?: string;
  /** 规格摘要（展示用，如「颜色:红色 / 尺码:M」），同时作为同商品不同规格的唯一键 */
  size?: string;
  /** 选中的规格组合原值：{ "색상": "레드", "사이즈": "M" } */
  options?: Record<string, string>;
  qty: number;
}

interface CartState {
  lines: CartLine[];
  add: (item: Omit<CartLine, 'qty'>, qty?: number) => void;
  setQty: (slug: string, size: string | undefined, qty: number) => void;
  remove: (slug: string, size?: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (item, qty = 1) =>
        set((s) => {
          const idx = s.lines.findIndex(
            (l) => l.slug === item.slug && l.size === item.size,
          );
          if (idx >= 0) {
            const lines = [...s.lines];
            lines[idx] = { ...lines[idx], qty: lines[idx].qty + qty };
            return { lines };
          }
          return { lines: [...s.lines, { ...item, qty }] };
        }),
      setQty: (slug, size, qty) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.slug === slug && l.size === size
              ? { ...l, qty: Math.max(1, qty) }
              : l,
          ),
        })),
      remove: (slug, size) =>
        set((s) => ({
          lines: s.lines.filter(
            (l) => !(l.slug === slug && l.size === size),
          ),
        })),
      clear: () => set({ lines: [] }),
    }),
    { name: 'webshopp-cart' },
  ),
);

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + l.price * l.qty, 0);
}
