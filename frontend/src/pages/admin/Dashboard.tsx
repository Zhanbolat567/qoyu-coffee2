import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

type Stats = { day_sales: number; month_sales: number; day_orders: number; month_orders: number };
type HourPoint = { hour: number; orders: number };
type RecentOrder = { id: number; customer_name: string; total: number; created_at: string }; // id = guest_seq

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rawHourly, setRawHourly] = useState<HourPoint[]>([]);
  const [recent, setRecent] = useState<RecentOrder[]>([]);

  // 0..23 заполняем нулями и сливаем с бэком
  const hourly: HourPoint[] = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of rawHourly) map.set(p.hour, p.orders);
    const out: HourPoint[] = [];
    for (let h = 0; h < 24; h++) out.push({ hour: h, orders: map.get(h) ?? 0 });
    return out;
  }, [rawHourly]);

  const maxOrders = useMemo(
    () => Math.max(1, ...hourly.map((p) => p.orders)),
    [hourly]
  );

  async function fetchAll() {
    const [s, h, r] = await Promise.all([
      api.get<Stats>("/dashboard/stats"),
      api.get<HourPoint[]>("/dashboard/hourly-summary"),
      api.get<RecentOrder[]>("/dashboard/recent-orders"),
    ]);
    setStats(s.data);
    setRawHourly(h.data ?? []);
    setRecent(r.data ?? []);
  }

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-screen-2xl">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-4 mb-6">
        <Card title="Продажи за день" value={`${(stats?.day_sales ?? 0).toLocaleString("ru-RU")} ₸`} />
        <Card title="Продажи за месяц" value={`${(stats?.month_sales ?? 0).toLocaleString("ru-RU")} ₸`} />
        <Card title="Заказы за день" value={`${stats?.day_orders ?? 0}`} />
        <Card title="Заказы за месяц" value={`${stats?.month_orders ?? 0}`} />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Hourly chart */}
        <div className="bg-white rounded-xl border p-4 lg:col-span-2">
          <div className="font-semibold mb-3">Заказы по часам</div>
          <div className="h-48 overflow-hidden">
            <div className="flex items-end gap-2 h-48">
              {hourly.map((p) => {
                // Нормализация по максимуму, чтобы влезало в 12rem (h-48)
                const hpx = Math.round((p.orders / maxOrders) * 180); // ~ 180px внутри 192px контейнера
                return (
                  <div key={p.hour} className="flex flex-col items-center justify-end" style={{ width: 22 }}>
                    <div className="bg-black w-full" style={{ height: Math.max(3, hpx) }} title={`${String(p.hour).padStart(2,"0")}: ${p.orders}`} />
                    <div className="text-xs text-slate-500 mt-1">{String(p.hour).padStart(2, "0")}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent orders (id = guest_seq) */}
        <div className="bg-white rounded-xl border p-4">
          <div className="font-semibold mb-3">Последние заказы</div>
          <div className="space-y-3">
            {recent.map((o) => (
              <div key={`${o.id}-${o.created_at}`} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border text-sm font-semibold">{o.id}</span>
                  <span className="text-slate-600">{o.customer_name || "Гость"}</span>
                </div>
                <div className="text-slate-700">{Number(o.total).toLocaleString("ru-RU")} ₸</div>
              </div>
            ))}
            {!recent.length && <div className="text-slate-500 text-sm">Нет заказов</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="text-slate-500 text-sm">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
