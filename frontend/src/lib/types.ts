// src/lib/types.ts

export type Role = 'cashier' | 'admin';
export type OrderStatus = 'active' | 'closed';

/** Пользователь */
export interface User {
  id: number;
  name: string;
  phone: string;
  role: Role;
}

/** Категория */
export interface Category {
  id: number;
  name: string;
  visible: boolean;
  sort: number;
}

/** Товар */
export interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
  photo_url?: string;
  category_id: number;
  active: boolean;
}

/** KPI для дашборда */
export interface KPI {
  sales_day: number;
  sales_month: number;
  orders_day: number;
  orders_month: number;
}

/** ==== Опции товара (группы/элементы) ==== */

/** Элемент опции (например «Кокосовое», «Карамель +150») */
export interface OptionItem {
  id: number;
  group_id: number;
  name: string;
  price_delta: number;   // может быть 0
  photo_url?: string;
  sort: number;
}

/** Группа опций (например «Молоко», «Сироп», «Температура») */
export interface OptionGroup {
  id: number;
  name: string;
  sort: number;
  /** элементы внутри группы */
  options: OptionItem[];
}

/** DTO для создания/обновления групп и элементов */
export interface OptionGroupCreate { name: string; sort?: number }
export interface OptionGroupUpdate { name?: string; sort?: number }
export interface OptionItemCreate { name: string; price_delta?: number; photo_url?: string; sort?: number }
export interface OptionItemUpdate { name?: string; price_delta?: number; photo_url?: string; sort?: number }

/** Товар c привязанными группами опций (для форм) */
export interface ProductWithGroups extends Product {
  group_ids?: number[];
}

/** ==== Заказы ==== */

/** Позиция в заказе (укороченный вид для списков) */
export interface OrderLineShort {
  id: number;
  name: string;   // название товара/позиции
  qty: number;
}

/** Заказ для списков «Активные/Закрытые» */
export interface Order {
  id: number;
  customer_name: string;
  status: OrderStatus;
  total: number;
  created_at?: string;
  items: OrderLineShort[];
}

/** ==== Аутентификация ==== */
export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  user: User;
}
