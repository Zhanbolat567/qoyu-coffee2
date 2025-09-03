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

      {/* ===== Ниже*
