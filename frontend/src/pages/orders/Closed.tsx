import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import api from "../../api/client";

type Item = { name: string; qty?: number; quantity?: number };
type Order = { id: number; customer_name: string; total: number; created_at: string; items: Item[] };

const mmssSince = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function OrdersClosed() {
  const [orders, setOrders] = useState<Order[]>([]);

  async function fetchClosed() {
    const { data } = await api.get<Order[]>("/orders", { params: { status: "closed", limit: 100 } });
    setOrders(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    fetchClosed(); // не автообновляется
  }, []);

  async function clearHistory() {
    try {
      await api.post("/orders/closed/clear");
    } catch {}
    setOrders([]);
  }

  return (
    <div className="mx-auto max-w-screen-2xl">
      <h1 className="text-3xl font-bold mb-4">Заказы</h1>

      <div className="mb-4 flex items-center justify-between">
       

        <button
          onClick={clearHistory}
          className="px-3 py-1.5 rounded-md bg-slate-200 hover:bg-slate-300 text-sm"
          title="Очистить список (и скрыть на табло «ГОТОВ»)"
        >
          Очистить историю
        </button>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">

        {orders.map((o) => (
          <div key={o.id} className="bg-white rounded-lg shadow overflow-hidden">
            {/* header с квадратными бейджами */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 grid place-items-center rounded-md bg-slate-100 font-semibold">
                  {o.id}
                </div>
                <div className="font-semibold">{o.customer_name || "Новый клиент"}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-slate-500 text-sm">{mmssSince(o.created_at)}</div>
                <span className="inline-block text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  закрыт
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
          </div>
        ))}

        {!orders.length && <div className="text-slate-500">Нет закрытых заказов</div>}
      </div>
    </div>
  );
}
