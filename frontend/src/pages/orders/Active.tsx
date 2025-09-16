import { useEffect, useRef, useState } from "react";
import api from "../../api/client";
import { CheckCircle2 } from "lucide-react";

type Modifier = { name: string };
type Item = {
  name: string;
  qty?: number;
  quantity?: number;
  modifiers?: Modifier[];
};
type Order = {
  id: number;
  customer_name: string;
  total: number;
  created_at: string;
  items: Item[];
};

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
};

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
      firstLoadRef.current = false;
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
    <div className="mx-auto max-w-screen-xl">
      <h1 className="text-3xl font-bold mb-6">Заказы</h1>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
        {orders.map((o) => (
          <div
            key={o.id}
            className="bg-white rounded-xl shadow border border-slate-200"
          >
            {/* header */}
            <div className="flex items-center justify-between px-4 pt-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold">{o.id}</span>
                <span className="text-slate-600">{o.customer_name || "Гость"}</span>
                <span className="text-slate-400">{hhmm(o.created_at)}</span>
              </div>
              <span className="inline-block text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                активен
              </span>
            </div>

            {/* items */}
            <div className="px-4 py-3 space-y-3">
              {o.items.map((it, i) => {
                const q = (it.qty ?? it.quantity ?? 1) as number;
                return (
                  <div key={i} className="text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{it.name}</span>
                      <span className="text-slate-500">x{q}</span>
                    </div>
                    {/* модификаторы */}
                    {it.modifiers && it.modifiers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {it.modifiers.map((m, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700"
                          >
                            {m.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* total */}
            <div className="border-t px-4 py-3 flex items-center justify-between">
              <div className="font-semibold">Итого:</div>
              <div className="font-semibold">
                {Number(o.total).toLocaleString("ru-RU")} ₸
              </div>
            </div>

            {/* finish */}
            <div className="px-4 pb-4">
              <button
                onClick={() => finish(o.id)}
                className="w-full rounded-md py-2 font-medium bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                Завершить заказ
              </button>
            </div>
          </div>
        ))}

        {!orders.length && (
          <div className="text-slate-500">Нет активных заказов</div>
        )}
      </div>
    </div>
  );
}
