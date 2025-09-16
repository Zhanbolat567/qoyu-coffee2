// src/pages/pos/OrdersActive.tsx
import { useEffect, useRef, useState } from "react";
import api from "../../api/client";
import { CheckCircle2 } from "lucide-react";

type Item = { name: string; qty?: number; quantity?: number };
type Order = {
  id: number;
  customer_name: string;
  take_away?: boolean;
  total: number;
  created_at: string;
  items: Item[];
};

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

// лёгкий звук-«динь» без аудиофайлов
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

export default function OrdersActive() {
  const [orders, setOrders] = useState<Order[]>([]);
  const prevIdsRef = useRef<number[]>([]);
  const firstLoadRef = useRef(true);

  async function fetchActive() {
    const { data } = await api.get<Order[]>("/orders", { params: { status: "active" } });
    const list = Array.isArray(data) ? data : [];
    const ids = list.map((o) => o.id);

    if (!firstLoadRef.current) {
      const prev = new Set(prevIdsRef.current);
      const hasNew = ids.some((id) => !prev.has(id));
      if (hasNew) playDing();
    } else {
      firstLoadRef.current = false; // первую загрузку без звука
    }

    prevIdsRef.current = ids;
    setOrders(list);
  }

  useEffect(() => {
    fetchActive();
    const id = setInterval(fetchActive, 1000);
    return () => clearInterval(id);
  }, []);

  async function finish(id: number) {
    try {
      await api.patch(`/orders/${id}/close`);
      setOrders((prev) => prev.filter((o) => o.id !== id));
      prevIdsRef.current = prevIdsRef.current.filter((x) => x !== id);
    } catch {}
  }

  return (
    <div className="mx-auto max-w-screen-2xl">
      <h1 className="text-3xl font-bold mb-6">Заказы</h1>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
        {orders.map((o) => (
          <div key={o.id} className="bg-white rounded-2xl shadow border border-slate-200">
            {/* header */}
            <div className="flex items-center justify-between px-5 pt-4">
              <div className="flex items-center gap-3 text-sm">
                {/* ID как «пилюля» */}
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-md
                             border border-slate-200 bg-slate-100 text-slate-800
                             font-semibold leading-none shadow-sm"
                >
                  {o.id}
                </span>

                <span className="text-slate-800 font-medium">
                  {o.customer_name || "Гость"}
                </span>

                <span className="text-slate-400">{hhmm(o.created_at)}</span>
              </div>

              <span className="inline-flex text-xs px-3 py-1 rounded-md bg-emerald-100 text-emerald-700">
                активен
              </span>
            </div>

            {/* items */}
            <div className="px-5 py-3 space-y-1">
              {o.items.map((it, i) => {
                const q = (it.qty ?? it.quantity ?? 1) as number;
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="truncate">{it.name}</div>
                    <div className="text-slate-500">x{q}</div>
                  </div>
                );
              })}
            </div>

            {/* total */}
            <div className="border-t px-5 py-3 flex items-center justify-between">
              <div className="font-semibold text-slate-600">Итого:</div>
              <div className="font-semibold">{Number(o.total).toLocaleString("ru-RU")} ₸</div>
            </div>

            {/* finish */}
            <div className="px-5 pb-5">
              <button
                onClick={() => finish(o.id)}
                className="w-full rounded-md py-2.5 font-semibold bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                Завершить заказ
              </button>
            </div>
          </div>
        ))}

        {!orders.length && <div className="text-slate-500">Нет активных заказов</div>}
      </div>
    </div>
  );
}
