// src/lib/cart.ts
import { create } from "zustand";

/** Позиция, которую кладём в корзину (без key) */
export type CartItemBase = {
  product_id: number;
  name: string;
  qty: number;                // кол-во
  unit_price: number;         // финальная цена единицы (база со скидкой + опции)
  base_unit_price?: number;   // база со скидкой (без опций) — уходит на сервер как unit_price_base
  orig_unit_price?: number;   // старая цена (для зачёркнутого)
  discount_pct?: number;      // % скидки (для бейджа и подписи)
  option_item_ids?: number[]; // ID выбранных опций
  option_names?: string[];    // Имена опций (для показа)
};

/** Позиция в состоянии (имеет уникальный key) */
export type CartItem = CartItemBase & { key: string };

/** Состояние и экшены корзины */
export type CartState = {
  items: CartItem[];
  addItem: (p: CartItemBase) => void;
  inc: (key: string) => void;
  dec: (key: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
};

/** Ключ объединяет одинаковые позиции (один и тот же товар + одинаковые опции + одинаковая база/скидка) */
const makeKey = (p: CartItemBase) => {
  const opts = (p.option_item_ids ?? []).slice().sort((a, b) => a - b).join(",");
  const base = p.base_unit_price ?? p.unit_price;
  const disc = p.discount_pct ?? 0;
  return `${p.product_id}|${opts}|${base}|${disc}`;
};

export const useCart = create<CartState>((set, get) => ({
  items: [],

  addItem: (p) =>
    set((s) => {
      const key = makeKey(p);
      const idx = s.items.findIndex((i) => i.key === key);
      if (idx >= 0) {
        const items = [...s.items];
        items[idx] = { ...items[idx], qty: items[idx].qty + (p.qty || 1) };
        return { items };
      }
      const item: CartItem = { ...p, qty: p.qty || 1, key };
      return { items: [...s.items, item] };
    }),

  inc: (key) =>
    set((s) => ({
      items: s.items.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i)),
    })),

  dec: (key) =>
    set((s) => ({
      items: s.items
        .map((i) => (i.key === key ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0),
    })),

  remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),

  clear: () => set({ items: [] }),

  total: () => get().items.reduce((sum, i) => sum + i.unit_price * i.qty, 0),

  count: () => get().items.reduce((n, i) => n + i.qty, 0),
}));
