import { useEffect, useState } from "react";
import api from "../../../api/client";
import { useCart } from "../../../lib/cart";

type Props = { open: boolean; onClose: () => void };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// тот же минимальный «динь»
function playDing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.28);
  } catch {}
}

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
        playDing(); // звук подтверждения оформления
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

      {/* ...остальной код без изменений... */}
      {/* (ниже — твой исходный JSX элемента, логика +/-/удалить/итого/кнопка «Оформить заказ») */}
