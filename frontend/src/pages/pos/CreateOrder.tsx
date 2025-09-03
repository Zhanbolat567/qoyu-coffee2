import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/client";
import { useCart } from "../../lib/cart";
import CartDrawer from "./components/CartDrawer";
import { Plus } from "lucide-react";

/* ====================== TYPES ====================== */
type ProductMin = { id: number; name: string; price: number; image_url?: string | null };
type ByCat = Record<string, ProductMin[]>;

type OptionItem = { id: number; name: string; price: number; image_url?: string | null };
type OptionGroup = {
  id: number;
  name: string;
  select_type: "single" | "multi";
  is_required: boolean;
  items: OptionItem[];
};

type ProductInfo = {
  id: number;
  name: string;
  base_price: number;
  image_url?: string | null;
  description?: string;
  option_group_ids: number[];
};

/* ====================== HELPERS ====================== */
const formatKZT = (n: number) => n.toLocaleString("ru-RU");

/* ====================== PRODUCT MODAL ====================== */
function ProductOptionsModal({
  product,
  groups,
  discountPct, // активная скидка для товара (если категория включена)
  onClose,
  onAdd,
}: {
  product: ProductInfo;
  groups: OptionGroup[];
  discountPct: number | null;
  onClose: () => void;
  onAdd: (payload: {
    unit_price: number;        // финальная цена (база со скидкой + опции)
    base_unit_price: number;   // база со скидкой (без опций) — для бэка
    orig_unit_price: number;   // старая цена (база без скидки + опции) — для показа
    option_item_ids: number[];
    option_names: string[];
    discount_pct: number | null;
  }) => void;
}) {
  // «Размер» показываем первой
  const sortedGroups = useMemo(() => {
    const g = [...groups];
    g.sort((a, b) => {
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();
      if (an === "размер" && bn !== "размер") return -1;
      if (bn === "размер" && an !== "размер") return 1;
      return 0;
    });
    return g;
  }, [groups]);

  const [selected, setSelected] = useState<Record<number, number[]>>({});

  useEffect(() => {
    const init: Record<number, number[]> = {};
    sortedGroups.forEach((g) => {
      init[g.id] = g.is_required && g.items.length ? [g.items[0].id] : [];
    });
    setSelected(init);
  }, [sortedGroups]);

  // сумма выбраных опций
  const optionsSum = useMemo(() => {
    const ids = new Set(Object.values(selected).flat());
    let s = 0;
    for (const g of sortedGroups) for (const it of g.items) if (ids.has(it.id)) s += it.price;
    return s;
  }, [selected, sortedGroups]);

  // База со скидкой
  const discountedBase = useMemo(() => {
    if (!discountPct) return product.base_price;
    const p = Math.round(product.base_price * (100 - discountPct) / 100);
    return p < 0 ? 0 : p;
  }, [product.base_price, discountPct]);

  const unitPrice = useMemo(() => Math.max(0, discountedBase + optionsSum), [discountedBase, optionsSum]);
  const origUnitPrice = useMemo(() => Math.max(0, product.base_price + optionsSum), [product.base_price, optionsSum]);

  const toggle = (gid: number, iid: number, type: "single" | "multi") => {
    setSelected((prev) => {
      const cur = prev[gid] || [];
      if (type === "single") return { ...prev, [gid]: [iid] };
      return { ...prev, [gid]: cur.includes(iid) ? cur.filter((x) => x !== iid) : [...cur, iid] };
    });
  };

  const handleAdd = () => {
    const option_item_ids = Object.values(selected).flat();
    const option_names = sortedGroups.flatMap((g) =>
      g.items.filter((i) => option_item_ids.includes(i.id)).map((i) => i.name)
    );
    onAdd({
      unit_price: unitPrice,
      base_unit_price: discountedBase,
      orig_unit_price: origUnitPrice,
      option_item_ids,
      option_names,
      discount_pct: discountPct,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md my-8 relative text-black flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center text-xl z-10"
          aria-label="Закрыть"
        >
          &times;
        </button>

        <div className="flex flex-col items-center p-6 pb-2 text-center">
          {product.image_url && (
            <img src={product.image_url} alt={product.name} className="w-28 h-28 object-cover rounded-md mx-auto mb-3" />
          )}
          <h2 className="text-2xl font-bold mb-1">{product.name}</h2>
          {product.description && <p className="text-gray-600 text-sm max-w-xs">{product.description}</p>}

          {discountPct ? (
            <div className="mt-2 text-sm">
              <span className="line-through text-gray-400 mr-2">{formatKZT(product.base_price)} ₸</span>
              <span className="font-semibold text-emerald-700">−{discountPct}% → {formatKZT(discountedBase)} ₸</span>
            </div>
          ) : null}
        </div>

        <div className="overflow-y-auto px-6 py-2 space-y-5 flex-shrink" style={{ maxHeight: "50vh" }}>
          {sortedGroups.map((g) => {
            const isSize = g.name.toLowerCase() === "размер";
            return (
              <div key={g.id}>
                <h3 className="font-semibold mb-3 text-lg">{g.name}</h3>

                {isSize ? (
                  <div className="flex items-center border border-gray-200 rounded-xl p-1">
                    {g.items.map((it) => {
                      const on = selected[g.id]?.includes(it.id);
                      return (
                        <button
                          key={it.id}
                          onClick={() => toggle(g.id, it.id, g.select_type)}
                          className={`flex-1 py-2 text-center rounded-lg font-medium transition-colors ${
                            on ? "bg-gray-800 text-white" : "hover:bg-gray-100 text-gray-700"
                          }`}
                          title={it.price ? (it.price > 0 ? `+${it.price} ₸` : `${it.price} ₸`) : "Без доплаты"}
                        >
                          {it.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {g.items.map((it) => {
                      const on = selected[g.id]?.includes(it.id);
                      return (
                        <button
                          key={it.id}
                          onClick={() => toggle(g.id, it.id, g.select_type)}
                          className={`p-2 border-2 rounded-xl text-center flex flex-col items-center justify-start space-y-1 aspect-square transition ${
                            on ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          {it.image_url && <img src={it.image_url} alt={it.name} className="w-12 h-12 object-contain" />}
                          <div className="flex flex-col flex-grow justify-center">
                            <span className="font-medium text-xs leading-tight">{it.name}</span>
                            {it.price !== 0 && (
                              <span className="text-xs text-gray-500 block">
                                {it.price > 0 ? "+" : ""}
                                {formatKZT(it.price)}&nbsp;₸
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-gray-50 border-t rounded-b-2xl mt-auto">
          <button
            onClick={handleAdd}
            className="w-full bg-blue-600 text-white font-bold py-3.5 px-6 rounded-xl text-lg flex justify-between items-center hover:bg-blue-700 transition"
          >
            <span>
              <Plus className="inline-block -mt-1 mr-1" size={20} /> Добавить
            </span>
            <span>{formatKZT(unitPrice)}&nbsp;₸</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================== PAGE ====================== */
function CreateOrderComponent() {
  const [byCat, setByCat] = useState<ByCat>({});
  const categories = useMemo(() => Object.keys(byCat), [byCat]);

  // "" = Все для навигации
  const [activeCat, setActiveCat] = useState<string>("");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const topRef = useRef<HTMLDivElement | null>(null);

  // Скидки: процент и список категорий
  const [discountPct, setDiscountPct] = useState<number | null>(null);
  const [discountCats, setDiscountCats] = useState<Set<string>>(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState<ProductInfo | null>(null);
  const [modalGroups, setModalGroups] = useState<OptionGroup[]>([]);
  const [modalDiscount, setModalDiscount] = useState<number | null>(null);

  const [loadingModal, setLoadingModal] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const { addItem } = useCart();

  /* ---- data ---- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get<ByCat>("/products");
        if (!alive) return;
        setByCat(data || {});
      } catch (e) {
        console.error("Не удалось загрузить /products", e);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ---- sticky category highlight ---- */
  useEffect(() => {
    if (!categories.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const first = entries.find((e) => e.isIntersecting);
        if (first) {
          const cat = (first.target as HTMLElement).dataset.cat;
          if (cat) setActiveCat(cat);
        }
      },
      { root: null, rootMargin: "-120px 0px -65% 0px", threshold: [0, 0.5, 1] }
    );
    Object.values(sectionRefs.current).forEach((el) => el && io.observe(el));

    const topIO = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setActiveCat("");
      },
      { root: null, rootMargin: "0px 0px -95% 0px", threshold: 0 }
    );
    if (topRef.current) topIO.observe(topRef.current);
    return () => { io.disconnect(); topIO.disconnect(); };
  }, [categories]);

  const goTo = (cat: string) => {
    setActiveCat(cat);
    const el = sectionRefs.current[cat];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const goToAll = () => {
    setActiveCat("");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ---- discount UI helpers ---- */
  const toggleCatDiscount = (cat: string) => {
    setDiscountCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };
  const clearDiscount = () => { setDiscountPct(null); setDiscountCats(new Set()); };

  /* ---- open product ---- */
  const openProduct = async (pid: number, catOfProduct: string) => {
    try {
      setLoadingModal(true);
      const { data: p } = await api.get<ProductInfo>(`/products/${pid}`);
      setModalProduct(p);

      let groups: OptionGroup[] = [];
      if (p?.option_group_ids?.length) {
        const { data: all } = await api.get<OptionGroup[]>(`/options/groups`);
        groups = (all || []).filter((g) => p.option_group_ids.includes(g.id));
      }
      setModalGroups(groups);

      // передаём активную скидку только если категория выбрана
      setModalDiscount(discountCats.has(catOfProduct) ? discountPct : null);

      setModalOpen(true);
    } catch (e) {
      console.error("Не удалось загрузить детали товара", e);
    } finally {
      setLoadingModal(false);
    }
  };

  const addFromModal = (p: {
    unit_price: number;
    base_unit_price: number;
    orig_unit_price: number;
    option_item_ids: number[];
    option_names: string[];
    discount_pct: number | null;
  }) => {
    if (!modalProduct) return;
    // Кладём в корзину все необходимые поля
    addItem({
      product_id: modalProduct.id,
      name: modalProduct.name,
      qty: 1,
      unit_price: p.unit_price,                // текущая цена
      base_unit_price: p.base_unit_price,      // база со скидкой
      orig_unit_price: p.orig_unit_price,      // старая цена (для UI)
      discount_pct: p.discount_pct || undefined,
      option_item_ids: p.option_item_ids,
      option_names: p.option_names,
    });
    setDrawerOpen(true);
    setModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-screen-2xl bg-gray-50 min-h-screen">
      <div className="p-4 sm:p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Создание заказа</h1>

        {/* ===== Панель скидок ===== */}
        <div className="mb-4 rounded-xl bg-white shadow p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold mr-2">Скидка:</div>
            {[10, 20, 30].map((p) => (
              <button
                key={p}
                onClick={() => setDiscountPct(p)}
                className={`px-3 py-1.5 rounded-full text-sm border ${
                  discountPct === p ? "bg-emerald-600 text-white border-emerald-600" : "bg-white hover:bg-gray-50"
                }`}
              >
                −{p}%
              </button>
            ))}
            <button
              onClick={clearDiscount}
              className="px-3 py-1.5 rounded-full text-sm border bg-white hover:bg-gray-50"
            >
              Сброс
            </button>
          </div>

          <div className="mt-3">
            <div className="text-sm text-gray-600 mb-1">К каким категориям применить:</div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const on = discountCats.has(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCatDiscount(c)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition ${
                      on ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              * Скидка применяется к базовой цене товаров выбранных категорий; опции не дисконтируются.
            </div>
          </div>
        </div>

        {/* ===== Навигация по категориям ===== */}
        <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm py-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={goToAll}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                activeCat === "" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Все
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => goTo(c)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  activeCat === c ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div ref={topRef} />

        {/* ===== Контент ===== */}
        <div className="space-y-10 mt-4">
          {categories.map((cat) => (
            <section
              key={cat}
              data-cat={cat}
              ref={(el: HTMLDivElement | null) => { sectionRefs.current[cat] = el; }}
              className="scroll-mt-24"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{cat}</h2>

              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">

                {(byCat[cat] || []).map((p) => {
                  const hasDisc = discountPct && discountCats.has(cat);
                  const discounted = hasDisc
                    ? Math.max(0, Math.round(Number(p.price) * (100 - (discountPct as number)) / 100))
                    : Number(p.price);

                  return (
                    <button
                      key={p.id}
                      onClick={() => openProduct(p.id, cat)}
                      className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-4 text-left flex flex-col"
                    >
                      <div className="relative w-full rounded-xl overflow-hidden mb-4 bg-gray-100 aspect-square">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="absolute inset-0 w-full h-full object-cover object-center"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 grid place-items-center text-gray-400">Нет фото</div>
                        )}
                      </div>

                      <div className="font-bold text-lg text-gray-800 flex-grow">{p.name}</div>

                      <div className="mt-2">
                        {hasDisc ? (
                          <div className="text-md">
                            <span className="line-through text-gray-400 mr-2">{formatKZT(Number(p.price))} ₸</span>
                            <span className="text-blue-600 font-semibold">{formatKZT(discounted)} ₸</span>
                          </div>
                        ) : (
                          <div className="text-blue-600 font-semibold text-md">
                            {formatKZT(Number(p.price))} ₸
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Корзина */}
      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Модалка товара */}
      {modalOpen && modalProduct && (
        <ProductOptionsModal
          product={modalProduct}
          groups={modalGroups}
          discountPct={modalDiscount}
          onClose={() => setModalOpen(false)}
          onAdd={addFromModal}
        />
      )}

      {/* Лоадер модалки */}
      {loadingModal && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/20">
          <div className="px-4 py-2 rounded-lg bg-white shadow">Загрузка…</div>
        </div>
      )}
    </div>
  );
}

export default function CreateOrder() {
  return <CreateOrderComponent />;
}
