import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

export type OptionItem = {
  id: number;
  name: string;
  price: number;
  image_url?: string | null;
};

export type OptionGroup = {
  id: number;
  name: string;
  select_type: "single" | "multi";
  is_required: boolean;
  items: OptionItem[];
};

export type ProductInfo = {
  id: number;
  name: string;
  base_price: number;
  image_url?: string | null;
  description?: string;
};

export default function ProductOptionsModal({
  product,
  groups,
  onClose,
  onAdd,
  discountPct = null, // НОВОЕ: можно передавать скидку
}: {
  product: ProductInfo;
  groups: OptionGroup[];
  onClose: () => void;
  onAdd: (payload: { unit_price: number; option_item_ids: number[]; option_names: string[] }) => void;
  discountPct?: number | null;
}) {
  // «Размер» ставим первым, если есть
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

  // База (с учётом скидки, если есть)
  const discountedBase = useMemo(() => {
    if (!discountPct) return product.base_price;
    const p = Math.round(product.base_price * (100 - discountPct) / 100);
    return p < 0 ? 0 : p;
  }, [product.base_price, discountPct]);

  // Итоговая цена = база + выбранные опции
  const unitPrice = useMemo(() => {
    let p = discountedBase;
    const ids = Object.values(selected).flat();
    for (const g of sortedGroups) {
      for (const it of g.items) if (ids.includes(it.id)) p += it.price;
    }
    return p;
  }, [discountedBase, sortedGroups, selected]);

  const toggle = (gid: number, iid: number, type: "single" | "multi") => {
    setSelected((prev) => {
      const cur = prev[gid] || [];
      if (type === "single") return { ...prev, [gid]: [iid] };
      const has = cur.includes(iid);
      return { ...prev, [gid]: has ? cur.filter((x) => x !== iid) : [...cur, iid] };
    });
  };

  const handleAdd = () => {
    const option_item_ids = Object.values(selected).flat();
    const option_names = sortedGroups.flatMap((g) =>
      g.items.filter((i) => option_item_ids.includes(i.id)).map((i) => i.name)
    );
    onAdd({ unit_price: unitPrice, option_item_ids, option_names });
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
              <span className="line-through text-gray-400 mr-2">
                {product.base_price.toLocaleString("ru-RU")} ₸
              </span>
              <span className="font-semibold text-emerald-700">
                −{discountPct}% → {discountedBase.toLocaleString("ru-RU")} ₸
              </span>
            </div>
          ) : null}
        </div>

        <div className="overflow-y-auto px-6 py-2 space-y-5 flex-shrink" style={{ maxHeight: "50vh" }}>
          {sortedGroups.map((g) => {
            const isSize = g.name.toLowerCase() === "размер";
            return (
              <div key={g.id}>
                <h3 className="font-semibold mb-3 text-lg">{g.name}</h3>

                {/* «Размер» рисуем сегментами */}
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
                                {it.price.toLocaleString("ru-RU")}&nbsp;₸
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
            <span>{unitPrice.toLocaleString("ru-RU")}&nbsp;₸</span>
          </button>
        </div>
      </div>
    </div>
  );
}
