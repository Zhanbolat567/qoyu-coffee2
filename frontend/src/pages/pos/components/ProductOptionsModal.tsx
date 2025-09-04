// src/pages/pos/components/ProductOptionsModal.tsx
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
};

export default function ProductOptionsModal({
  product,
  groups,
  onClose,
  onAdd,
  discountPct = null,
}: {
  product: ProductInfo;
  groups: OptionGroup[];
  onClose: () => void;
  onAdd: (p: { unit_price: number; option_item_ids: number[]; option_names: string[] }) => void;
  discountPct?: number | null;
}) {
  const formatKZT = (n: number) => n.toLocaleString("ru-RU");

  const sorted = useMemo(() => {
    const g = [...groups];
    g.sort((a, b) => {
      const an = a.name.toLowerCase(), bn = b.name.toLowerCase();
      if (an === "размер" && bn !== "размер") return -1;
      if (bn === "размер" && an !== "размер") return 1;
      return 0;
    });
    return g;
  }, [groups]);

  const sizeGroup = useMemo(() => sorted.find((g) => g.name.toLowerCase() === "размер") || null, [sorted]);

  const [sel, setSel] = useState<Record<number, number[]>>({});

  useEffect(() => {
    const init: Record<number, number[]> = {};
    sorted.forEach((g) => (init[g.id] = g.is_required && g.items.length ? [g.items[0].id] : []));
    setSel(init);
  }, [sorted]);

  const otherSum = useMemo(() => {
    const ids = new Set(Object.values(sel).flat());
    let s = 0;
    for (const g of sorted) {
      if (sizeGroup && g.id === sizeGroup.id) continue;
      for (const it of g.items) if (ids.has(it.id)) s += it.price;
    }
    return s;
  }, [sel, sorted, sizeGroup]);

  const sizeAddon = useMemo(() => {
    if (!sizeGroup) return 0;
    const picked = sel[sizeGroup.id]?.[0];
    if (!picked) return 0;
    const it = sizeGroup.items.find((x) => x.id === picked);
    return it ? Number(it.price) : 0;
  }, [sel, sizeGroup]);

  const before = useMemo(() => Math.max(0, product.base_price + sizeAddon + otherSum), [product.base_price, sizeAddon, otherSum]);
  const final = useMemo(() => (discountPct ? Math.max(0, Math.round(before * (100 - discountPct) / 100)) : before), [before, discountPct]);

  const priceForSize = (addon: number) => {
    const b = Math.max(0, product.base_price + addon);
    return discountPct ? Math.max(0, Math.round(b * (100 - discountPct) / 100)) : b;
  };

  const toggle = (gid: number, iid: number, type: "single" | "multi") => {
    setSel((prev) => {
      const cur = prev[gid] || [];
      return type === "single" ? { ...prev, [gid]: [iid] } : { ...prev, [gid]: cur.includes(iid) ? cur.filter((x) => x !== iid) : [...cur, iid] };
    });
  };

  const add = () => {
    const option_item_ids = Object.values(sel).flat();
    const option_names = sorted.flatMap((g) => g.items.filter((i) => option_item_ids.includes(i.id)).map((i) => i.name));
    onAdd({ unit_price: final, option_item_ids, option_names });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md my-8 relative text-black flex flex-col" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center text-xl z-10" aria-label="Закрыть">
          &times;
        </button>

        <div className="flex flex-col items-center p-6 pb-2 text-center">
          {product.image_url && <img src={product.image_url} alt={product.name} className="w-28 h-28 object-cover rounded-md mx-auto mb-3" />}
          <h2 className="text-2xl font-bold mb-1">{product.name}</h2>
          {discountPct ? (
            <div className="mt-2 text-sm">
              <span className="line-through text-gray-400 mr-2">{formatKZT(before)} ₸</span>
              <span className="font-semibold text-emerald-700">−{discountPct}% → {formatKZT(final)} ₸</span>
            </div>
          ) : (
            <div className="mt-2 text-sm font-semibold">{formatKZT(final)} ₸</div>
          )}
        </div>

        <div className="overflow-y-auto px-6 py-2 space-y-5 flex-shrink" style={{ maxHeight: "50vh" }}>
          {sorted.map((g) => {
            const isSize = sizeGroup && g.id === sizeGroup.id;
            return (
              <div key={g.id}>
                <h3 className="font-semibold mb-3 text-lg">{g.name}</h3>

                {isSize ? (
                  <div className="flex items-center border border-gray-200 rounded-xl p-1">
                    {g.items.map((it) => {
                      const on = sel[g.id]?.includes(it.id);
                      const p = priceForSize(Number(it.price));
                      return (
                        <button
                          key={it.id}
                          onClick={() => toggle(g.id, it.id, g.select_type)}
                          className={`flex-1 py-2 text-center rounded-lg font-medium transition-colors ${on ? "bg-gray-800 text-white" : "hover:bg-gray-100 text-gray-700"}`}
                        >
                          <div>{it.name}</div>
                          <div className={`text-xs ${on ? "text-white/80" : "text-gray-500"}`}>{formatKZT(p)} ₸</div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {g.items.map((it) => {
                      const on = sel[g.id]?.includes(it.id);
                      return (
                        <button
                          key={it.id}
                          onClick={() => toggle(g.id, it.id, g.select_type)}
                          className={`p-2 border-2 rounded-xl text-center flex flex-col items-center justify-start space-y-1 aspect-square transition ${on ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                        >
                          <span className="font-medium text-xs leading-tight">{it.name}</span>
                          {it.price !== 0 && <span className="text-xs text-gray-500 block">{it.price > 0 ? "+" : ""}{formatKZT(it.price)}&nbsp;₸</span>}
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
          <button onClick={add} className="w-full bg-blue-600 text-white font-bold py-3.5 px-6 rounded-xl text-lg flex justify-between items-center hover:bg-blue-700 transition">
            <span><Plus className="inline-block -mt-1 mr-1" size={20} /> Добавить</span>
            <span>{formatKZT(final)}&nbsp;₸</span>
          </button>
        </div>
      </div>
    </div>
  );
}
