import React from "react";

type CartItem = {
  product_id: number;
  name: string;
  qty: number;
  base_price: number;
  option_item_ids: number[];
  option_names: string[];
  unit_price: number;
};

const fmt = (v: unknown) => Number(v ?? 0).toLocaleString("ru-RU");

export default function CartDrawer({
  open,
  onClose,
  items,
  total,
  onInc,
  onDec,
  onRemove,
  onClear,
  customer,
  onCustomer,
  takeAway,
  onTakeAway,
  onSubmit,
  saving,
  error,
}: {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  onInc: (index: number) => void;
  onDec: (index: number) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
  customer: string;
  onCustomer: (v: string) => void;
  takeAway: boolean;
  onTakeAway: (v: boolean) => void;
  onSubmit: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div
      className={[
        "fixed inset-0 z-50 transition",
        open ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
      aria-hidden={!open}
    >
      {/* фон */}
      <div
        onClick={onClose}
        className={[
          "absolute inset-0 bg-black/30 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />
      {/* правый сайд */}
      <div
        className={[
          "absolute right-0 top-0 h-full w-[380px] bg-white shadow-xl transition-transform",
          open ? "translate-x-0" : "translate-x-full",
          "flex flex-col",
        ].join(" ")}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <div className="text-lg font-semibold">Корзина</div>
          <button onClick={onClose} className="text-slate-500 hover:text-black">✕</button>
        </div>

        <div className="p-4 flex-1 overflow-auto space-y-3">
          {items.length === 0 ? (
            <div className="text-slate-500">Пока пусто. Добавьте товары из каталога.</div>
          ) : (
            items.map((it, idx) => (
              <div key={idx} className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{it.name}</div>
                  {it.option_names.length > 0 && (
                    <div className="text-xs text-slate-500 mt-0.5">{it.option_names.join(", ")}</div>
                  )}
                  <div className="text-sm text-slate-600 mt-1">{fmt(it.unit_price)} ₸</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-2 py-1 bg-slate-100 rounded" onClick={() => onDec(idx)}>-</button>
                  <span className="w-6 text-center">{it.qty}</span>
                  <button className="px-2 py-1 bg-slate-100 rounded" onClick={() => onInc(idx)}>+</button>
                  <button className="ml-2 text-red-600" onClick={() => onRemove(idx)}>×</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t space-y-3">
          {items.length > 0 && (
            <button onClick={onClear} className="text-sm text-red-600 hover:underline">
              Очистить корзину
            </button>
          )}

          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Имя клиента"
            value={customer}
            onChange={(e) => onCustomer(e.target.value)}
          />

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={takeAway} onChange={(e) => onTakeAway(e.target.checked)} />
            с собой
          </label>

          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Итого</span>
            <span>{fmt(total)} ₸</span>
          </div>

          <button
            onClick={onSubmit}
            disabled={saving || items.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg disabled:opacity-60"
          >
            {saving ? "Оформление…" : "Оформить заказ"}
          </button>

          {error && <div className="text-red-600 text-sm">{error}</div>}
        </div>
      </div>
    </div>
  );
}
