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

// --- iPhone-like chime (не оригинал) --------------------
let _dingCtx: AudioContext | null = null;
function getCtx() {
  if (typeof window === "undefined") return null as any;
  if (_dingCtx) return _dingCtx;
  const AC = (window.AudioContext || (window as any).webkitAudioContext);
  _dingCtx = AC ? new AC() : null;
  return _dingCtx;
}
export async function playIOSLikeDing() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch {}
  }

  // частоты (≈ C6–E6–G6)
  const freqs = [1047, 1319, 1568];
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);

  freqs.forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const detune = (i - 1) * 4; // лёгкий детюн
    o.type = i === 0 ? "triangle" : "sine";
    o.frequency.setValueAtTime(f, now);
    o.detune.setValueAtTime(detune, now);

    // быстрая атака + экспоненциальный спад
    const t0 = now + i * 0.05;
    const a = 0.01;
    const d = 0.45;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);

    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + d + 0.05);
  });

  // короткий «хвост» общим гейном
  master.gain.setValueAtTime(0.6, now);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
}
// -------------------------------------------------------

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
      if (hasNew) playIOSLikeDing();
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
    <div className="mx-auto max-w-screen-2xl">
      <h1 className="text-3xl font-bold mb-4">Заказы</h1>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <div key={o.id} className="bg-white rounded-lg shadow overflow-hidden">
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

            <div className="border-t px-4 py-3 flex items-center justify-between">
              <div className="font-semibold">Итого:</div>
              <div className="font-semibold">{Number(o.total).toLocaleString("ru-RU")} ₸</div>
            </div>

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
