import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useUI } from "../../store/uiStore";

type SelectType = "single" | "multi";

export type OptionItem = { id: number; name: string; price: number };
export type OptionGroup = {
  id: number;
  name: string;
  select_type: SelectType;
  is_required?: boolean;
  items: OptionItem[];
};

export default function OptionModal({
  product,
  groups,
  onClose,
  onAdd,
}: {
  product: { id: number; name: string; price: number };
  groups: OptionGroup[];
  onClose: () => void;
  onAdd: (payload: { options: OptionItem[]; finalPrice: number }) => void;
}) {
  const { t } = useUI();
  const [selected, setSelected] = useState<Record<number, Set<number>>>({});

  useEffect(() => {
    // preselect first item for required single groups (как «Размер»)
    const initial: Record<number, Set<number>> = {};
    for (const g of groups) {
      if (g.select_type === "single") {
        initial[g.id] = new Set<number>();
        if (g.is_required && g.items[0]) initial[g.id].add(g.items[0].id);
      } else {
        initial[g.id] = new Set<number>();
      }
    }
    setSelected(initial);
  }, [groups]);

  function toggle(g: OptionGroup, item: OptionItem) {
    setSelected((prev) => {
      const set = new Set(prev[g.id] || []);
      if (g.select_type === "single") {
        set.clear();
        set.add(item.id);
      } else {
        set.has(item.id) ? set.delete(item.id) : set.add(item.id);
      }
      return { ...prev, [g.id]: set };
    });
  }

  const chosenItems: OptionItem[] = useMemo(() => {
    const all: OptionItem[] = [];
    for (const g of groups) {
      const set = selected[g.id] || new Set();
      for (const it of g.items) if (set.has(it.id)) all.push(it);
    }
    return all;
  }, [selected, groups]);

  const finalPrice = useMemo(
    () => product.price + chosenItems.reduce((s, i) => s + i.price, 0),
    [product.price, chosenItems]
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto">
      <div className="bg-white w-[760px] rounded-2xl shadow-xl mt-24">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="text-xl font-semibold">{product.name}</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <X />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {groups.map((g) => (
            <section key={g.id}>
              <div className="mb-3 font-medium">{g.name}</div>
              <div className="flex flex-wrap gap-3">
                {g.items.map((it) => {
                  const active = selected[g.id]?.has(it.id);
                  return (
                    <button
                      key={it.id}
                      onClick={() => toggle(g, it)}
                      className={`px-4 py-2 rounded-lg border ${
                        active ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-sm">{it.name}</div>
                      <div className={`text-xs ${active ? "text-white/80" : "text-slate-500"}`}>
                        {it.price > 0 ? `+${it.price} ₸` : "+0 ₸"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="p-6 border-t flex justify-end">
          <button
            onClick={() => onAdd({ options: chosenItems, finalPrice })}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {t("addFor")} {finalPrice.toLocaleString("ru-KZ")} ₸
          </button>
        </div>
      </div>
    </div>
  );
}
