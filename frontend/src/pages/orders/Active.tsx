import { useEffect, useRef, useState } from "react";
import api from "../../api/client";
import { CheckCircle2 } from "lucide-react";

type Item = {
  name: string;
  qty?: number;
  quantity?: number;
  options?: string[];
  option_names?: string[];
  option_details?: string[];
  modifiers?: { name: string }[];
};
type Order = {
  id: number;
  customer_name: string;
  total: number;
  created_at: string;
  items: Item[];
};

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

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
    o.start(); o.stop(ctx.currentTime + 0.28);
  } catch {}
}

function splitNameAndInlineOptions(raw: string): { base: string; inline: string[] } {
  const s = (raw || "").trim();
  const open = s.lastIndexOf("(");
  const close = s.lastIndexOf(")");
  if (open !== -1 && close !== -1 && close > open) {
    const base = s.slice(0, open).trim().replace(/[·\-–—,:;]+$/g, "");
    const inside = s.slice(open + 1, close).trim();
    const parts = inside.split(/[;,]/g).map(x => x.trim()).filter(Boolean);
    return { base: base || s, inline: parts };
  }
  return { base: s, inline: [] };
}

function normOptions(it: Item, fromNameInline: string[]): string[] {
  if (it.options?.length) return it.options;
  if (it.option_names?.length) return it.option_names;
  if (it.option_details?.length) return it.option_details;
  if (it.modifiers?.length) return it.modifiers.map(m => m.name);
  return fromNameInline;
}

export default function OrdersActive() {
  const [orders, setOrders] = useState<Order[]>([]);
  const prevIdsRef = useRef<number[]>([]);
  const firstLoadRef = useRef(true);

  async function fetchActive() {
    const { data } = await api.get<Order[]>("/orders", { params: { status: "active" } });
    const list = Array.isArray(data) ? data : [];
    const ids = list.map(o => o.id);

    if (!firstLoadRef.current) {
      const prev = new Set(prevIdsRef.current);
      if (ids.some(id => !prev.has(id))) playDing();
    } else firstLoadRef.current = false;

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
      setOrders(p => p.filter(o => o.id !== id));
      prevIdsRef.current = prevIdsRef.current.filter(x => x !== id);
    } catch {}
  }

  return (
    <div className="mx-auto max-w-screen-xl">
      <h1 className="text-3xl font-bold mb-6">Заказы</h1>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {orders.map(o => (
          <div key={o.id} className="bg-white rounded-2xl shadow border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-extrabold text-[18px] leading-none">{o.id}</span>
                <span className="text-slate-700 font-medium">{o.customer_name || "Гость"}</span>
                <span className="text-slate-400">{hhmm(o.created_at)}</span>
              </div>
              <span className="text-xs px-3 py-1 rounded-md bg-emerald-100 text-emerald-700">
                активен
              </span>
            </div>

            {/* Items */}
            <div className="px-6 py-4 space-y-4">
              {o.items.map((it, i) => {
                const q = (it.qty ?? it.quantity ?? 1) as number;
                const { base, inline } = splitNameAndInlineOptions(it.name || "");
                const opts = normOptions(it, inline);

                return (
                  <div key={i} className="text-sm">
                    <div className="flex items-start justify-between">
                      <span className="font-medium">{base}</span>
                      <span className="text-slate-500">x{q}</span>
                    </div>

                    {/* ВАЖНО: flex-wrap вместо grid */}
                    {opts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
                        {opts.map((label, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center text-[12px] leading-5 px-3 py-1
                                       rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="border-t px-6 py-3 flex items-center justify-between">
              <div className="text-slate-600 font-semibold">Итого:</div>
              <div className="font-semibold">{Number(o.total).toLocaleString("ru-RU")} ₸</div>
            </div>

            {/* Finish */}
            <div className="px-6 pb-5">
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
