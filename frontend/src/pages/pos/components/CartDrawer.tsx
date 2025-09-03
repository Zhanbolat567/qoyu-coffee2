import { useEffect, useState } from "react";
import api from "../../../api/client";
import { useCart } from "../../../lib/cart";
import { playIOSLikeDing } from "../orders/Active"; // <- импорт звука

type Props = { open: boolean; onClose: () => void };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function CartDrawer({ open, onClose }: Props) {
  const { items, inc, dec, remove, clear, total } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);

  async function submit() {
    const name =
      (document.getElementById("cartCustomer") as HTMLInputElement)?.value?.trim() || "Гость";
    const takeAway =
      (document.getElementById("cartTakeAway") as HTMLInputElement)?.checked || false;

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
      const hasCreatedId = res?.data && (res.data.id || res.data.order?.id || res.data?.data?.id);

      if (okStatus || hasCreatedId) {
        // пользовательский жест уже произошёл -> звук не блокируется
        await playIOSLikeDing();

        setOk(true);
        await sleep(900);
        setOk(false);
        clear();
        onClose();
        return;
      }
    } catch {
      // оставить корзину как есть
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

      {/* ===== Ниже оставь твой JSX корзины как был ===== */}
      <div
        className={`fixed inset-0 z-50 transition ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* полупрозрачный фон */}
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        {/* сама панель справа */}
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl
            transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
          role="dialog"
          aria-modal="true"
        >
          {/* ... твой контент корзины ... */}
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-semibold">Корзина</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-10rem)]">
            {items.map((it: any) => (
              <div key={it.key || it.product_id} className="border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-slate-500">{(it.unit_price ?? it.price)?.toLocaleString("ru-RU")} ₸</div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button className="px-2 py-1 rounded bg-slate-100" onClick={() => dec(it)}>−</button>
                  <div className="w-8 text-center">{it.qty}</div>
                  <button className="px-2 py-1 rounded bg-slate-100" onClick={() => inc(it)}>＋</button>
                  <button className="ml-auto px-2 py-1 rounded bg-rose-50 text-rose-600" onClick={() => remove(it)}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
            {!items.length && <div className="text-slate-500">Корзина пуста</div>}
          </div>

          <div className="p-4 border-t space-y-3">
            <div className="flex items-center gap-2">
              <input id="cartCustomer" className="border rounded-md px-3 py-2 w-full" placeholder="Имя клиента (необязательно)" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input id="cartTakeAway" type="checkbox" className="scale-110" />
              С собой
            </label>

            <div className="flex items-center justify-between font-semibold">
              <span>Итого:</span>
              <span>{total.toLocaleString("ru-RU")} ₸</span>
            </div>

            <button
              onClick={submit}
              disabled={submitting || !items.length}
              className="w-full rounded-md py-2 font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
            >
              {submitting ? "Отправляем..." : "Оформить заказ"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
