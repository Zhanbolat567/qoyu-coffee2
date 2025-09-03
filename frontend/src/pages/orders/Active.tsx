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

const mmssSince = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// лёгкий звук-«динь» без аудиофайлов (Web Audio)
function playDing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime); // A5
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
      // Есть ли новые ID, которых раньше не было?
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
      <h1 className="text-3xl font-bold mb-4">Заказы</h1>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <div key={o.id} className="bg-white rounded-lg shadow overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 grid place-items-center rounded-md bg-slate-100 font-semibold">
                  {o.id}
                </div>
                <div className="font-semibold">{o.customer_name || "Гость"}</div>
                {o.take_away ? (
                  <span className="inline-block text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                    с собой
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-slate-500 text-sm">{mmssSince(o.created_at)}</div>
                <span className="inline-block text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  активен
                </span>
              </div>
            </div>

            {/* items */}
            <div className="px-4 py-2 space-y-1">
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
            <div className="border-t px-4 py-3 flex items-center justify-between">
              <div className="font-semibold">Итого:</div>
              <div className="font-semibold">{Number(o.total).toLocaleString("ru-RU")} ₸</div>
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

        {!orders.length && <div className="text-slate-500">Нет активных заказов</div>}
      </div>
    </div>
  );
}
