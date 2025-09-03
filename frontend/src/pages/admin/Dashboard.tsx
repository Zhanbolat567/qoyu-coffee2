import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Stats = { day_sales: number; month_sales: number; day_orders: number; month_orders: number; };
type HourPoint = { hour: number; orders: number };
type Recent = { id: number; customer_name: string; total: number; created_at: string };

const kzt = (n?: number) => n==null ? "–" : `${n.toLocaleString("ru-KZ")} ₸`;

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [hourly, setHourly] = useState<HourPoint[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);

  async function fetchOnce() {
    const [s, h, r] = await Promise.all([
      api.get("/dashboard/stats"),
      api.get("/dashboard/hourly-summary"),
      api.get("/dashboard/recent-orders?limit=5"),
    ]);
    setStats(s.data); setHourly(h.data); setRecent(r.data);
  }

  useEffect(() => { connectWS(); fetchOnce(); return () => wsRef.current?.close(); }, []);

  function connectWS() {
    const base = import.meta.env.VITE_API_URL as string;
    const wsUrl = base.replace(/^http/, "ws") + "/dashboard/ws";
    const ws = new WebSocket(wsUrl); wsRef.current = ws;
    ws.onopen = () => { retryRef.current = 0; };
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.stats) setStats(msg.stats);
        if (msg.hourly) setHourly(msg.hourly);
        if (msg.recent) setRecent(msg.recent);
      } catch (_) {}
    };
    ws.onclose = () => {
      const backoff = Math.min(1000 * Math.pow(2, retryRef.current++), 15000);
      setTimeout(connectWS, backoff);
    };
    ws.onerror = () => ws.close();
  }

  const viewHours = useMemo(
    () => (hourly.filter((p) => p.hour >= 9 && p.hour <= 20).length >= 3 ? hourly.filter((p) => p.hour >= 9 && p.hour <= 20) : hourly),
    [hourly]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        {[
          { t: "Продажи за день", v: kzt(stats?.day_sales) },
          { t: "Продажи за месяц", v: kzt(stats?.month_sales) },
          { t: "Заказы за день", v: stats?.day_orders ?? "–" },
          { t: "Заказы за месяц", v: stats?.month_orders ?? "–" },
        ].map((x, i) => (
          <div key={i} className="bg-white rounded-xl shadow p-4">
            <div className="text-slate-500 text-sm">{x.t}</div>
            <div className="text-2xl font-semibold">{x.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl shadow p-4">
          <div className="text-lg font-semibold mb-2">Заказы по часам</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={viewHours.map(p => ({ h: p.hour.toString().padStart(2, "0"), orders: p.orders }))}>
                <XAxis dataKey="h" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-lg font-semibold mb-3">Последние заказы</div>
          <div className="space-y-2">
            {recent.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-flex w-7 h-6 items-center justify-center rounded-md bg-slate-100 font-medium">{o.id}</span>
                  <div>
                    <div className="font-medium">{o.customer_name}</div>
                    <div className="text-slate-500">{new Date(o.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
                <div className="font-semibold">{kzt(o.total)}</div>
              </div>
            ))}
            {!recent.length && <div className="text-slate-500 text-sm">Пока заказов нет</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
