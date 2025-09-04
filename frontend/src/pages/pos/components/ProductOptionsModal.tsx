import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

export type OptionItem = { id: number; name: string; price: number; image_url?: string | null };
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
  option_group_ids?: number[];
};

const formatKZT = (n: number) => n.toLocaleString("ru-RU");
const isSizeName = (s: string) => s.trim().toLowerCase().startsWith("размер");

export default function ProductOptionsModal({
  product,
  groups,
  discountPct = null,
  onClose,
  onAdd,
}: {
  product: ProductInfo;
  groups: OptionGroup[];
  discountPct?: number | null;
  onClose: () => void;
  onAdd: (p: {
    unit_price: number;
    base_unit_price: number;
    orig_unit_price: number;
    option_item_ids: number[];
    option_names: string[];
    discount_pct: number | null;
  }) => void;
}) {
  // «Размер» — первый
  const sortedGroups = useMemo(() => {
    const g = [...groups];
    g.sort((a, b) => {
      const aIs = isSizeName(a.name);
      const bIs = isSizeName(b.name);
      if (aIs && !bIs) return -1;
      if (bIs && !aIs) return 1;
      return 0;
    });
    return g;
  }, [groups]);

  const sizeGroup = useMemo(
    () => sortedGroups.find((gg) => isSizeName(gg.name)) || null,
    [sortedGroups]
  );

  const [selected, setSelected] = useState<Record<number, number[]>>({});

  useEffect(() => {
    const init: Record<number, number[]> = {};
    sortedGroups.forEach((g) => {
      init[g.id] = g.is_required && g.items.length ? [g.items[0].id] : [];
    });
    setSelected(init);
  }, [sortedGroups]);

  // Сумма опций КРОМЕ размера
  const otherOptionsSum = useMemo(() => {
    const ids = new Set(Object.values(selected).flat());
    let s = 0;
    for (const g of sortedGroups) {
      if (sizeGroup && g.id === sizeGroup.id) continue;
      for (const it of g.items) if (ids.has(it.id)) s += it.price;
    }
    return s;
  }, [selected, sortedGroups, sizeGroup]);

  // Надбавка за выбранный размер
  const sizeAddon = useMemo(() => {
    if (!sizeGroup) return 0;
    const picked = selected[sizeGroup.id]?.[0];
    if (!picked) return 0;
    const item = sizeGroup.items.find((i) => i.id === picked);
    return item ? Number(item.price) : 0;
  }, [selected, sizeGroup]);

  // Полная цена ДО скидки
  const fullBefore = useMemo(
    () => Math.max(0, Number(product.base_price) + sizeAddon + otherOptionsSum),
    [product.base_price, sizeAddon, otherOptionsSum]
  );

  // После скидки
  const discountedTotal = useMemo(() => {
    if (!discountPct) return fullBefore;
    return Math.max(0, Math.round((fullBefore * (100 - discountPct)) / 100));
  }, [fullBefore, discountPct]);

  // База для сервера: чтобы база + все опции (вкл. размер) == discountedTotal
  const baseForServer = useMemo(
    () => Math.max(0, discountedTotal - (sizeAddon + otherOptionsSum)),
    [discountedTotal, sizeAddon, otherOptionsSum]
  );

  // Цена «за размер» (без прочих опций), чтобы показать на кнопках размера
  const priceForSize = (addon: number) => {
    const before = Math.max(0, Number(product.base_price) + addon);
    if (!discountPct) return before;
    return Math.max(0, Math.round((before * (100 - discountPct)) / 100));
  };

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
      unit_price: discountedTotal,
      base_unit_price: baseForServer,
      orig_unit_price: fullBefore,
      option_item_ids,
      option_names,
      discount_pct: discountPct ?? null,
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

          {discountPct ? (
            <div className="mt-2 text-sm">
              <span className="line-through text-gray-400 mr-2">{formatKZT(fullBefore)} ₸</span>
              <span className="font-semibold text-emerald-700">
                −{discountPct}% → {formatKZT(discountedTotal)} ₸
              </span>
            </div>
          ) : (
            <div className="mt-2 text-sm font-semibold">{formatKZT(fullBefore)} ₸</div>
          )}
        </div>

        <div className="overflow-y-auto px-6 py-2 space-y-5 flex-shrink" style={{ maxHeight: "50vh" }}>
          {sortedGroups.map((g) => {
            const isSize = sizeGroup && g.id === sizeGroup.id;
            return (
              <div key={g.id}>
                <h3 className="font-semibold mb-3 text-lg">{g.name}</h3>

                {isSize ? (
                  <div className="flex items-center border border-gray-200 rounded-xl p-1">
                    {g.items.map((it) => {
                      const on = selected[g.id]?.includes(it.id);
                      const p = priceForSize(Number(it.price));
                      return (
                        <button
                          key={it.id}
                          onClick={() => toggle(g.id, it.id, g.select_type)}
                          className={`flex-1 py-2 text-center rounded-lg font-medium transition-colors ${
                            on ? "bg-gray-800 text-white" : "hover:bg-gray-100 text-gray-700"
                          }`}
                        >
                          <div>{it.name}</div>
                          <div className={`text-xs ${on ? "text-white/80" : "text-gray-500"}`}>
                            {formatKZT(p)} ₸
                          </div>
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
                          {it.image_url && (
                            <img src={it.image_url} alt={it.name} className="w-12 h-12 object-contain" />
                          )}
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
            <span>{formatKZT(discountedTotal)}&nbsp;₸</span>
          </button>
        </div>
      </div>
    </div>
  );
}
