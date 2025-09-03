// src/components/ProductOptionsModal.tsx
import React, { useMemo, useState } from "react";

type ModalOptionItem = { id: number; name: string; price: number };
type ModalOptionGroup = {
  id: number;
  name: string;
  select_type: "single" | "multi";
  is_required: boolean;
  items: ModalOptionItem[];
};

type ModalProduct = {
  id: number;
  name: string;
  price: number;           // базовая цена
  image_url?: string | null;
};

export default function ProductOptionsModal({
  open,
  product,
  groups,
  onClose,
  onAdd,
}: {
  open: boolean;
  product: ModalProduct;
  groups: ModalOptionGroup[];
  onClose: () => void;
  onAdd: (payload: { option_item_ids: number[]; option_names: string[]; unit_price: number }) => void;
}) {
  // groupId -> Set<optionItemId>
  const [picked, setPicked] = useState<Record<number, Set<number>>>({});

  const base = Number(product.price ?? 0);

  const pickedItems: ModalOptionItem[] = useMemo(() => {
    const arr: ModalOptionItem[] = [];
    for (const g of groups) {
      const ids = picked[g.id] ? Array.from(picked[g.id]) : [];
      for (const id of ids) {
        const it = g.items.find((x) => x.id === id);
        if (it) arr.push(it);
      }
    }
    return arr;
  }, [picked, groups]);

  const optionsSum = pickedItems.reduce((s, it) => s + Number(it.price ?? 0), 0);
  const unitPrice = base + optionsSum;

  function toggle(group: ModalOptionGroup, opt: ModalOptionItem) {
    setPicked((prev) => {
      const cur = new Set(prev[group.id] ? prev[group.id] : []);
      if (group.select_type === "single") {
        if (cur.has(opt.id)) cur.clear();
        else {
          cur.clear();
          cur.add(opt.id);
        }
      } else {
        cur.has(opt.id) ? cur.delete(opt.id) : cur.add(opt.id);
      }
      return { ...prev, [group.id]: cur };
    });
  }

  function isSelected(groupId: number, optionId: number) {
    return !!picked[groupId]?.has(optionId);
  }

  function canSubmit() {
    // если групп нет — можно сразу добавлять
    if (!groups?.length) return true;
    // у обязательных групп должен быть выбор
    return groups.every((g) => !g.is_required || (picked[g.id] && picked[g.id].size > 0));
  }

  function submit() {
    const ids = pickedItems.map((x) => x.id);
    const names = pickedItems.map((x) => x.name);
    onAdd({ option_item_ids: ids, option_names: names, unit_price: unitPrice });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <div className="text-xl font-semibold">{product.name}</div>
          <button onClick={onClose} className="text-slate-500 hover:text-black">✕</button>
        </div>

        <div className="p-5 space-y-6">
          {(!groups || groups.length === 0) && (
            <div className="text-slate-600">Для этого товара нет настраиваемых опций.</div>
          )}

          {groups.map((g) => (
            <div key={g.id}>
              <div className="font-medium mb-2">
                {g.name}{" "}
                <span className="text-xs text-slate-500">
                  {g.select_type === "single" ? "одиночный" : "множественный"}
                  {g.is_required ? " · обязат." : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {g.items.map((it) => {
                  const sel = isSelected(g.id, it.id);
                  return (
                    <button
                      key={it.id}
                      onClick={() => toggle(g, it)}
                      className={[
                        "px-3 py-2 rounded-lg border text-sm",
                        sel ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div>{it.name}</div>
                      {Number(it.price ?? 0) !== 0 && (
                        <div className="opacity-70 text-xs mt-0.5">
                          {Number(it.price).toLocaleString("ru-RU")} ₸
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border bg-white hover:bg-slate-50">
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit()}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          >
            Добавить за {unitPrice.toLocaleString("ru-RU")} ₸
          </button>
        </div>
      </div>
    </div>
  );
}
