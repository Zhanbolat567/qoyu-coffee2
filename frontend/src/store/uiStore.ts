import { create } from "zustand";

type Locale = "ru" | "kk";

const dict: Record<Locale, Record<string, string>> = {
  ru: {
    brand: "QOYU Coffee",
    createOrder: "Создать заказ",
    dashboard: "Dashboard",
    menu: "Меню",
    orders: "Заказы",
    active: "Активные",
    closed: "Закрытые",
    settings: "Настройки",
    logout: "Выйти",
    kk: "Каз",
    ru: "Рус",
    makeOrder: "Создание заказа",
    cart: "Корзина",
    customerName: "Имя клиента",
    checkout: "Оформить заказ",
    addFor: "Добавить за",
  },
  kk: {
    brand: "QOYU Coffee",
    createOrder: "Тапсырыс жасау",
    dashboard: "Дашборд",
    menu: "Мәзір",
    orders: "Тапсырыстар",
    active: "Белсенді",
    closed: "Жабық",
    settings: "Баптаулар",
    logout: "Шығу",
    kk: "Қаз",
    ru: "Рус",
    makeOrder: "Тапсырыс құру",
    cart: "Себет",
    customerName: "Клиенттің аты",
    checkout: "Растау",
    addFor: "Қосу",
  },
};

type UIState = {
  locale: Locale;
  isCartOpen: boolean;
  setLocale: (l: Locale) => void;
  t: (k: keyof typeof dict["ru"]) => string;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

export const useUI = create<UIState>((set, get) => ({
  locale: (localStorage.getItem("qoyu_locale") as Locale) || "ru",
  isCartOpen: false,
  setLocale(l) {
    localStorage.setItem("qoyu_locale", l);
    set({ locale: l });
  },
  t(k) {
    const { locale } = get();
    return dict[locale][k] ?? k;
  },
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
  toggleCart: () => set((s) => ({ isCartOpen: !s.isCartOpen })),
}));
