import { useEffect, useState } from "react";
import api from "../../../api/client";
import { useCart } from "../../../lib/cart";

type Props = { open: boolean; onClose: () => void };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function CartDrawer({ open, onClose }: Props) {
  const { items, inc, dec, remove, clear, total } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false); // "Заказ принят" плашка

  async function submit() {
    const name =
      (document.getElementById("cartCustomer") as HTMLInputElement)?.value?.trim() || "Гость";
    const takeAway =
      (document.getElementById("cartTakeAway") as HTMLInputElement)?.checked || false;

    // Пробрасываем базу со скидкой + суффикс названия (видно в Активных/Закрытых)
    const body = {
      customer_name: name,
      take_away: takeAway,
      items: items.map((i: any) => ({
        product_id: i.product_id,
        qty: i.qty,
        option_item_ids: i.option_item_ids || [],
        unit_price_base: typeof i.base_unit_price === "number" ? i.base_unit_price : undefined,
        name_suffix: i?.discount_pct ? ` [-${i.discount_pct}%]` : undefined,
      })),
    };

    setSubmitting(true);
    try {
      const res = await api.post("/orders", body, { validateStatus: () => true });
      const okStatus = res.status >= 200 && res.status < 300;
      const hasCreatedId =
        res?.data && (res.data.id || res.data.order?.id || res.data?.data?.id);

      if (okStatus || hasCreatedId || res.status >= 500) {
        setOk(true);
        await sleep(900);
        setOk(false);
        clear();
        onClose();
        return;
      }
    } catch {
      // корзина остаётся для повтора
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Плашка подтверждения */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 bottom-6 z-[70] 
        flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white shadow-lg
        transition-all duration-500
        ${ok ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
        aria-live="polite"
      >
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white text-sm"
          aria-hidden
        >
          ✓
        </span>
        <span>Заказ принят</span>
      </div>

      <div className={`fixed inset-0 z-[60] ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
        {/* затемнение */}
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
          onClick={onClose}
        />
        {/* панель */}
        <aside
          className={`absolute right-0 top-0 h-full w-full sm:w-[380px] max-w-full bg-white shadow-xl transform transition-transform ${
            open ? "translate-x-0" : "translate-x-full"
          } flex flex-col`}
          aria-label="Корзина"
        >
          {/* header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="text-lg font-semibold">Корзина</div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
              ✕
            </button>
          </div>

          {/* items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!items.length && (
              <div className="text-slate-500">Пока пусто. Добавьте товары из каталога.</div>
            )}

            {items.map((i: any) => (
              <div key={i.key} className="flex items-start gap-3 border rounded-lg p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    {i.name}
                    {i.discount_pct ? (
                      <span className="ml-2 inline-block text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        −{i.discount_pct}%
                      </span>
                    ) : null}
                  </div>

                  {!!i.option_names?.length && (
                    <div className="text-xs text-slate-500 break-words">
                      {i.option_names.join(", ")}
                    </div>
                  )}

                  <div className="text-sm text-slate-700 mt-1">
                    {i.discount_pct && typeof i.orig_unit_price === "number" ? (
                      <>
                        <span className="line-through text-slate-400 mr-2">
                          {i.orig_unit_price.toLocaleString("ru-RU")} ₸
                        </span>
                        <span className="font-semibold text-emerald-700">
                          → {i.unit_price.toLocaleString("ru-RU")} ₸
                        </span>
                      </>
                    ) : (
                      <span>{i.unit_price.toLocaleString("ru-RU")} ₸</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 rounded bg-slate-100"
                    onClick={() => dec(i.key)}
                    disabled={submitting}
                  >
                    -
                  </button>
                  <div className="w-7 text-center">{i.qty}</div>
                  <button
                    className="px-2 py-1 rounded bg-slate-100"
                    onClick={() => inc(i.key)}
                    disabled={submitting}
                  >
                    +
                  </button>
                </div>

                <button
                  className="text-red-500 text-sm"
                  onClick={() => remove(i.key)}
                  disabled={submitting}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>

          {/* footer */}
          <div className="p-4 border-t space-y-3">
            <input
              id="cartCustomer"
              className="w-full border rounded-md px-3 py-2"
              placeholder="Имя клиента"
            />
            <label className="flex items-center gap-2 text-sm">
              <input id="cartTakeAway" type="checkbox" /> с собой
            </label>

            <div className="flex items-center justify-between font-semibold">
              <div>Итого</div>
              <div>{total().toLocaleString("ru-RU")} ₸</div>
            </div>

            <button
              onClick={submit}
              disabled={!items.length || submitting}
              aria-busy={submitting}
              className={`w-full rounded-lg py-2 font-semibold text-white ${
                items.length && !submitting
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-emerald-400 cursor-not-allowed"
              }`}
            >
              {submitting ? "Отправка..." : "Оформить заказ"}
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
